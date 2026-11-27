package com.msheker.alterf1.og;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Team colours for link-preview images: the frontend's table (og/team-colors.json, kept equal by a
 * frontend test) and the same hashed fallback as its teamColor().
 */
public final class TeamColors {

    private static final Pattern ENTRY = Pattern.compile("\"([^\"]+)\"\\s*:\\s*\"(#[0-9a-fA-F]{6})\"");

    private final Map<String, String> known;

    private TeamColors(Map<String, String> known) {
        this.known = Map.copyOf(known);
    }

    public static TeamColors load() {
        try (InputStream in = TeamColors.class.getResourceAsStream("/og/team-colors.json")) {
            if (in == null) {
                throw new IllegalStateException("og/team-colors.json is missing");
            }
            String json = new String(in.readAllBytes(), StandardCharsets.UTF_8);
            Map<String, String> known = new HashMap<>();
            Matcher m = ENTRY.matcher(json);
            while (m.find()) {
                known.put(m.group(1), m.group(2).toLowerCase(Locale.ROOT));
            }
            return new TeamColors(known);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** "#rrggbb" for a constructor id. */
    public String hex(String constructorId) {
        String normalized = constructorId.strip().toLowerCase(Locale.ROOT);
        String color = known.get(normalized);
        if (color != null) {
            return color;
        }
        long hue = hash(normalized.isEmpty() ? "unknown" : normalized) % 360;
        return hslToHex((int) hue, 62, 58);
    }

    /** FNV-1a over UTF-16 code units, unsigned 32-bit (as Math.imul / >>> 0 in JavaScript). */
    private static long hash(String input) {
        int hash = (int) 2166136261L;
        for (int i = 0; i < input.length(); i++) {
            hash ^= input.charAt(i);
            hash *= 16777619;
        }
        return Integer.toUnsignedLong(hash);
    }

    private static String hslToHex(int hue, int saturation, int lightness) {
        double s = saturation / 100.0;
        double l = lightness / 100.0;
        double c = (1 - Math.abs(2 * l - 1)) * s;
        double x = c * (1 - Math.abs(((hue / 60.0) % 2) - 1));
        double m = l - c / 2;
        double r = 0;
        double g = 0;
        double b = 0;
        if (hue < 60) {
            r = c;
            g = x;
        } else if (hue < 120) {
            r = x;
            g = c;
        } else if (hue < 180) {
            g = c;
            b = x;
        } else if (hue < 240) {
            g = x;
            b = c;
        } else if (hue < 300) {
            r = x;
            b = c;
        } else {
            r = c;
            b = x;
        }
        return "#%02x%02x%02x".formatted(channel(r + m), channel(g + m), channel(b + m));
    }

    /** Math.round in JavaScript rounds .5 up, like Math.floor(v + 0.5). */
    private static int channel(double value) {
        return (int) Math.floor(value * 255 + 0.5);
    }
}
