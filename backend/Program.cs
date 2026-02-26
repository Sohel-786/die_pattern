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

// Configure Port (matching Node.js backend)
// Port configuration will be handled by environment variables (e.g., ASPNETCORE_URLS)

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

// Apply pending migrations and schema fallbacks so the app works on any environment (publish-only deploy, no explicit migrations).
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var logger = services.GetRequiredService<ILogger<Program>>();
    var env = services.GetRequiredService<IWebHostEnvironment>();
    try
    {
        var context = services.GetRequiredService<ApplicationDbContext>();
        // Apply any pending migrations on startup (creates DB if missing, runs new migrations)
        context.Database.Migrate();

        // Ensure purchase_order_items has Rate (fallback if migration did not run)
        EnsurePOItemSchema(context);

        // Ensure companies has new master fields (fallback if AddCompanyMasterFields migration did not run)
        EnsureCompanyMasterFieldsSchema(context);

        // Ensure IsActive exists on purchase_indents and purchase_orders (fallback when DB was copied/restored or migrations skipped)
        EnsureIsActiveColumnsSchema(context);

        // Ensure purchase_orders has GstPercent, GstType, QuotationUrlsJson (fallback when deploy is publish-only, no migrations run)
        EnsurePurchaseOrderColumnsSchema(context);

        // Remove LocationId from purchase_indents if still present (fallback when clone has old schema before RemoveLocationIdFromPurchaseIndents migration)
        EnsureRemovePILocationId(context);

        DbInitializer.Initialize(context);
        logger.LogInformation("Database migrations and seeding completed.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred while migrating or seeding the database.");
        if (env.IsProduction())
            throw;
        logger.LogWarning("Continuing without database in Development. Set ConnectionStrings:DefaultConnection (e.g. LocalDB) and ensure SQL Server/LocalDB is running, then restart.");
    }
}

app.Run();

static void EnsurePOItemSchema(ApplicationDbContext context)
{
    try
    {
        // Add Rate to purchase_order_items if missing (migrations handle moving PO-level rate to items and dropping Rate from purchase_orders)
        context.Database.ExecuteSqlRaw(@"
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('purchase_order_items') AND name = 'Rate')
                ALTER TABLE purchase_order_items ADD Rate DECIMAL(18,2) NOT NULL DEFAULT 0;
        ");
    }
    catch (Exception) { /* Schema may already be correct, or table may not exist yet */ }
}

static void EnsureCompanyMasterFieldsSchema(ApplicationDbContext context)
{
    try
    {
        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID(N'[dbo].[companies]') IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'Pan')
                    ALTER TABLE [dbo].[companies] ADD [Pan] nvarchar(50) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'State')
                    ALTER TABLE [dbo].[companies] ADD [State] nvarchar(100) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'City')
                    ALTER TABLE [dbo].[companies] ADD [City] nvarchar(100) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'Pincode')
                    ALTER TABLE [dbo].[companies] ADD [Pincode] nvarchar(20) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'Phone')
                    ALTER TABLE [dbo].[companies] ADD [Phone] nvarchar(30) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[companies]') AND name = 'Email')
                    ALTER TABLE [dbo].[companies] ADD [Email] nvarchar(255) NULL;
            END
        ");
    }
    catch (Exception) { /* Schema may already be correct */ }
}

static void EnsureIsActiveColumnsSchema(ApplicationDbContext context)
{
    try
    {
        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID(N'[dbo].[purchase_indents]') IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[purchase_indents]') AND name = 'IsActive')
                    ALTER TABLE [dbo].[purchase_indents] ADD [IsActive] bit NOT NULL DEFAULT 1;
            END
            IF OBJECT_ID(N'[dbo].[purchase_orders]') IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[purchase_orders]') AND name = 'IsActive')
                    ALTER TABLE [dbo].[purchase_orders] ADD [IsActive] bit NOT NULL DEFAULT 1;
            END
        ");
    }
    catch (Exception) { /* Schema may already be correct */ }
}

static void EnsurePurchaseOrderColumnsSchema(ApplicationDbContext context)
{
    try
    {
        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID(N'[dbo].[purchase_orders]') IS NOT NULL
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[purchase_orders]') AND name = 'GstPercent')
                    ALTER TABLE [dbo].[purchase_orders] ADD [GstPercent] decimal(18,2) NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[purchase_orders]') AND name = 'GstType')
                    ALTER TABLE [dbo].[purchase_orders] ADD [GstType] int NULL;
                IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[purchase_orders]') AND name = 'QuotationUrlsJson')
                    ALTER TABLE [dbo].[purchase_orders] ADD [QuotationUrlsJson] nvarchar(max) NULL;
            END
        ");
    }
    catch (Exception) { /* Schema may already be correct */ }
}

static void EnsureRemovePILocationId(ApplicationDbContext context)
{
    try
    {
        context.Database.ExecuteSqlRaw(@"
            IF OBJECT_ID(N'[dbo].[purchase_indents]') IS NOT NULL
            BEGIN
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[purchase_indents]') AND name = 'LocationId')
                BEGIN
                    IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID(N'[dbo].[purchase_indents]') AND name = 'FK_purchase_indents_locations_LocationId')
                        ALTER TABLE [dbo].[purchase_indents] DROP CONSTRAINT [FK_purchase_indents_locations_LocationId];
                    IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'[dbo].[purchase_indents]') AND name = 'IX_purchase_indents_LocationId')
                        DROP INDEX [IX_purchase_indents_LocationId] ON [dbo].[purchase_indents];
                    ALTER TABLE [dbo].[purchase_indents] DROP COLUMN [LocationId];
                END
            END
        ");
    }
    catch (Exception) { /* Schema may already be correct or table may not exist yet */ }
}
