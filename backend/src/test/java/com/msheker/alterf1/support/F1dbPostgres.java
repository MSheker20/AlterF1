package com.msheker.alterf1.support;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.Map;
import org.testcontainers.containers.Container;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

public final class F1dbPostgres {

	public static final String RO_USER = "alterf1_ro";
	public static final String RO_PASSWORD = "ro-test";
	public static final String OWNER_USER = "owner";
	public static final String OWNER_PASSWORD = "owner-test";

	private static final String IMAGE = "postgres:18-alpine";
	private static final String DATABASE_NAME = "alterf1";
	private static final Path F1DB_ENV_REL = Path.of("infra", "f1db", "f1db.env");
	private static final Path LOAD_SH_REL = Path.of("infra", "f1db", "load.sh");
	private static final Path CACHE_DIR_REL = Path.of("infra", "f1db", ".cache");
	private static final System.Logger LOGGER = System.getLogger(F1dbPostgres.class.getName());

	private static volatile PostgreSQLContainer instance;

	private F1dbPostgres() {
	}

	public static PostgreSQLContainer get() {
		PostgreSQLContainer current = instance;
		if (current != null) {
			return current;
		}
		synchronized (F1dbPostgres.class) {
			if (instance == null) {
				instance = startContainer();
			}
			return instance;
		}
	}

	private static PostgreSQLContainer startContainer() {
		Path repoRoot = findRepoRoot();
		Path loadSh = repoRoot.resolve(LOAD_SH_REL);
		if (!Files.isRegularFile(loadSh)) {
			throw new IllegalStateException("F1DB loader script not found at " + loadSh);
		}

		F1dbConfig config;
		Path zipFile;
		try {
			config = loadConfig(repoRoot.resolve(F1DB_ENV_REL));
			zipFile = ensureCachedZip(repoRoot.resolve(CACHE_DIR_REL), config);
		} catch (IOException e) {
			throw new UncheckedIOException("Failed to prepare F1DB release archive", e);
		}

		PostgreSQLContainer container = new PostgreSQLContainer(IMAGE)
				.withDatabaseName(DATABASE_NAME)
				.withUsername(OWNER_USER)
				.withPassword(OWNER_PASSWORD);
		container.start();

		try {
			String zipName = zipFile.getFileName().toString();
			container.copyFileToContainer(MountableFile.forHostPath(loadSh), "/f1db/load.sh");
			container.copyFileToContainer(MountableFile.forHostPath(zipFile), "/cache/" + zipName);

			String cmd = "PGHOST=localhost"
					+ " PGUSER=" + shellQuote(OWNER_USER)
					+ " PGPASSWORD=" + shellQuote(OWNER_PASSWORD)
					+ " PGDATABASE=" + shellQuote(DATABASE_NAME)
					+ " F1DB_VERSION=" + shellQuote(config.version())
					+ " F1DB_SHA256=" + shellQuote(config.sha256())
					+ " ALTERF1_RO_USER=" + shellQuote(RO_USER)
					+ " ALTERF1_RO_PASSWORD=" + shellQuote(RO_PASSWORD)
					+ " F1DB_CACHE_DIR=/cache"
					+ " sh /f1db/load.sh";
			Container.ExecResult result = container.execInContainer("sh", "-c", cmd);
			if (result.getExitCode() != 0) {
				throw new IllegalStateException(
						"F1DB load.sh failed with exit code " + result.getExitCode()
								+ "\nstdout:\n" + result.getStdout()
								+ "\nstderr:\n" + result.getStderr());
			}
			LOGGER.log(System.Logger.Level.INFO, () -> "F1DB container ready:\n" + result.getStdout());
			return container;
		} catch (Exception e) {
			container.stop();
			if (e instanceof RuntimeException runtimeException) {
				throw runtimeException;
			}
			if (e instanceof InterruptedException) {
				Thread.currentThread().interrupt();
			}
			throw new IllegalStateException("Failed to load F1DB into PostgreSQL container", e);
		}
	}

	private static Path findRepoRoot() {
		Path start = Path.of("").toAbsolutePath().normalize();
		for (Path dir = start; dir != null; dir = dir.getParent()) {
			if (Files.isRegularFile(dir.resolve(F1DB_ENV_REL))) {
				return dir;
			}
		}
		throw new IllegalStateException(
				"Could not locate repository root containing " + F1DB_ENV_REL + " starting from " + start);
	}

	private static F1dbConfig loadConfig(Path envFile) throws IOException {
		Map<String, String> values = new HashMap<>();
		for (String rawLine : Files.readAllLines(envFile, StandardCharsets.UTF_8)) {
			String line = rawLine.trim();
			if (line.isEmpty() || line.startsWith("#")) {
				continue;
			}
			int eq = line.indexOf('=');
			if (eq <= 0) {
				continue;
			}
			String key = line.substring(0, eq).trim();
			String value = line.substring(eq + 1).trim();
			values.put(key, value);
		}
		String version = values.get("F1DB_VERSION");
		String sha256 = values.get("F1DB_SHA256");
		if (version == null || version.isBlank() || sha256 == null || sha256.isBlank()) {
			throw new IllegalStateException("F1DB_VERSION and F1DB_SHA256 must be set in " + envFile);
		}
		return new F1dbConfig(version, sha256);
	}

	private static Path ensureCachedZip(Path cacheDir, F1dbConfig config) throws IOException {
		String zipName = "f1db-" + config.version() + "-sql-postgresql.zip";
		Path zipPath = cacheDir.resolve(zipName);
		if (Files.isRegularFile(zipPath)) {
			String existingSha = sha256Hex(zipPath);
			if (existingSha.equalsIgnoreCase(config.sha256())) {
				LOGGER.log(System.Logger.Level.INFO, () -> "Using cached F1DB archive at " + zipPath);
				return zipPath;
			}
			LOGGER.log(System.Logger.Level.WARNING, () -> "Cached F1DB archive SHA-256 mismatch at " + zipPath
					+ " (expected " + config.sha256() + ", found " + existingSha + "); re-downloading");
		}

		Files.createDirectories(cacheDir);
		URI downloadUri = URI.create(
				"https://github.com/f1db/f1db/releases/download/" + config.version() + "/f1db-sql-postgresql.zip");
		Path partFile = cacheDir.resolve(zipName + ".part");
		Files.deleteIfExists(partFile);

		LOGGER.log(System.Logger.Level.INFO, () -> "Downloading F1DB " + config.version() + " from " + downloadUri);
		try (HttpClient client = HttpClient.newBuilder()
				.followRedirects(HttpClient.Redirect.NORMAL)
				.connectTimeout(Duration.ofSeconds(30))
				.build()) {
			HttpRequest request = HttpRequest.newBuilder(downloadUri)
					.GET()
					.timeout(Duration.ofMinutes(5))
					.build();
			HttpResponse<Path> response = client.send(request, HttpResponse.BodyHandlers.ofFile(partFile));
			if (response.statusCode() != 200) {
				Files.deleteIfExists(partFile);
				throw new IllegalStateException(
						"Failed to download " + downloadUri + " (HTTP " + response.statusCode() + ")");
			}
		} catch (InterruptedException e) {
			Files.deleteIfExists(partFile);
			Thread.currentThread().interrupt();
			throw new IllegalStateException("Interrupted while downloading " + downloadUri, e);
		} catch (IOException e) {
			Files.deleteIfExists(partFile);
			throw e;
		}

		String actualSha = sha256Hex(partFile);
		if (!actualSha.equalsIgnoreCase(config.sha256())) {
			Files.deleteIfExists(partFile);
			throw new IllegalStateException(
					"SHA-256 mismatch for " + downloadUri + ": expected " + config.sha256() + ", got " + actualSha);
		}

		try {
			Files.move(partFile, zipPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
		} catch (AtomicMoveNotSupportedException e) {
			Files.move(partFile, zipPath, StandardCopyOption.REPLACE_EXISTING);
		}
		LOGGER.log(System.Logger.Level.INFO, () -> "Verified and cached F1DB archive at " + zipPath);
		return zipPath;
	}

	private static String sha256Hex(Path file) throws IOException {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			try (InputStream in = Files.newInputStream(file)) {
				byte[] buffer = new byte[64 * 1024];
				int read;
				while ((read = in.read(buffer)) != -1) {
					digest.update(buffer, 0, read);
				}
			}
			return HexFormat.of().formatHex(digest.digest());
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256 algorithm not available", e);
		}
	}

	private static String shellQuote(String value) {
		return "'" + value.replace("'", "'\\''") + "'";
	}

	private record F1dbConfig(String version, String sha256) {
	}

}
