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

// Ensure storage directory exists
var storagePath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "storage");
if (!Directory.Exists(storagePath))
{
    Directory.CreateDirectory(storagePath);
}

app.UseStaticFiles(); // For standard wwwroot files
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(storagePath),
    RequestPath = "/storage"
});
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Clean, migration-based database initialization
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var env = services.GetRequiredService<IWebHostEnvironment>();
    
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        
        // 1. Handle Schema: Apply pending migrations
        context.Database.Migrate();
        
        // 2. Handle Data: Seed initial/required data
        DbInitializer.Initialize(context);
        
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
