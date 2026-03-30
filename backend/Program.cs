// DATABASE ARCHITECTURE RULE:
// - Schema changes handled ONLY via EF Core migrations.
// - Data seeding handled ONLY via DbInitializer.
// - No runtime schema patching allowed.

using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using net_backend.Data;
using net_backend.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICodeGeneratorService, CodeGeneratorService>();
builder.Services.AddScoped<IExcelService, ExcelService>();
builder.Services.AddScoped<IItemStateService, ItemStateService>();
builder.Services.AddScoped<IItemSnapshotBackfillService, ItemSnapshotBackfillService>();

// Configure Database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                context.Token = context.Request.Cookies["access_token"];
                return Task.CompletedTask;
            }
        };
    });

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000", "http://localhost:3001")
                   .AllowAnyMethod()
                   .AllowAnyHeader()
                   .AllowCredentials()
                   .WithExposedHeaders("Content-Disposition");
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Ensure storage directory exists (uploads at runtime are served from /storage)
var storagePath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "storage");
if (!Directory.Exists(storagePath))
{
    Directory.CreateDirectory(storagePath);
}

// Serve Next.js static export + runtime uploaded files from wwwroot.
// /storage is served automatically because uploads are stored in wwwroot/storage.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// SPA fallback for routes that don't have a pre-generated static file.
// Keeps production behavior consistent with QC_Tool.
app.MapFallbackToFile("index.html");

// Clean, migration-based database initialization
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var env = services.GetRequiredService<IWebHostEnvironment>();
    var aesKey = builder.Configuration["PasswordEncryption:Key"]
        ?? throw new InvalidOperationException("PasswordEncryption:Key is not configured.");
    
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        
        // 1. Handle Schema: Apply pending migrations
        context.Database.Migrate();
        
        // 2. Handle Data: Seed initial/required data
        DbInitializer.Initialize(context, aesKey);
        
        // 3. Backfill null item name snapshots for traceability (old records created before snapshot columns)
        var backfill = services.GetRequiredService<net_backend.Services.IItemSnapshotBackfillService>();
        backfill.BackfillNullSnapshotsAsync().GetAwaiter().GetResult();
        logger.LogInformation("Item name snapshot backfill completed.");
        
        logger.LogInformation("Database initialized successfully (migrations and seeding).");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while initializing the database.");
        if (env.IsProduction())
            throw;
    }
}

app.Run();
