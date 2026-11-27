package com.msheker.alterf1.og;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.Polygon;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import javax.imageio.ImageIO;

import org.springframework.stereotype.Component;

import com.msheker.alterf1.api.StandingsDtos.StandingLine;
import com.msheker.alterf1.api.StandingsDtos.StandingsResponse;

/**
 * Draws the 1200×630 link-preview images (PLAN.md §2.4) with Java2D: the headline "champion changed"
 * and the top of the tower, in the site's dark broadcast style. Uses the logical SansSerif font,
 * which is DejaVu Sans in the JRE image (covers Turkish).
 */
@Component
public class OgImageRenderer {

    static final int WIDTH = 1200;
    static final int HEIGHT = 630;
    private static final int TOWER_ROWS = 8;

    private static final Color BG = new Color(0x0b0d10);
    private static final Color SURFACE = new Color(0x14171c);
    private static final Color BORDER = new Color(0x262b33);
    private static final Color TEXT = new Color(0xe8eaed);
    private static final Color MUTED = new Color(0x8b93a1);
    private static final Color ACCENT = new Color(0xe10600);
    private static final Color UP = new Color(0x22c55e);
    private static final Color DOWN = new Color(0xef4444);

    private final TeamColors colors = TeamColors.load();

    public byte[] season(StandingsResponse s, OgLanguage lang, boolean scenarioActive) {
        BufferedImage image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = start(image);
        brand(g);

        String system = s.system();
        int x = 64;
        g.setFont(font(Font.BOLD, 24));
        g.setColor(MUTED);
        g.drawString("%d · %s".formatted(s.season(), lang.rules(system)).toUpperCase(localeOf(lang)), x, 196);

        g.setFont(font(Font.BOLD, 22));
        g.setColor(s.championChanged() ? ACCENT : MUTED);
        g.drawString(s.championChanged() ? lang.changedKicker() : lang.sameKicker(), x, 250);

        String champion = s.champion() == null ? "—" : surname(s.champion().driverName());
        g.setColor(TEXT);
        g.setFont(fitFont(g, champion, Font.BOLD, 96, 560));
        g.drawString(champion, x, 350);

        g.setFont(font(Font.PLAIN, 34));
        g.setColor(MUTED);
        if (s.championChanged() && s.realChampion() != null) {
            g.drawString(lang.insteadOf(surname(s.realChampion().driverName())), x, 404);
        } else {
            g.drawString(lang.realChampionWas(), x, 404);
        }
        if (scenarioActive) {
            g.setFont(font(Font.PLAIN, 24));
            g.drawString("+ " + lang.scenarioNote(), x, 448);
        }

        tower(g, s.standings().subList(0, Math.min(TOWER_ROWS, s.standings().size())), lang);
        footer(g, lang);
        return png(image, g);
    }

    public byte[] home(OgLanguage lang) {
        BufferedImage image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = start(image);
        brand(g);
        g.setColor(TEXT);
        g.setFont(font(Font.BOLD, 72));
        g.drawString(lang.homeTitle(), 64, 300);
        g.setColor(ACCENT);
        g.drawString(lang.homeAccent(), 64, 390);
        g.setColor(MUTED);
        g.setFont(font(Font.PLAIN, 30));
        g.drawString(lang.tagline(), 64, 470);
        footer(g, lang);
        return png(image, g);
    }

    private void tower(Graphics2D g, List<StandingLine> rows, OgLanguage lang) {
        int left = 700;
        int top = 120;
        int width = 436;
        int rowHeight = 52;
        g.setColor(SURFACE);
        g.fillRoundRect(left, top, width, rowHeight * rows.size() + 16, 16, 16);
        g.setColor(BORDER);
        g.setStroke(new BasicStroke(1.5f));
        g.drawRoundRect(left, top, width, rowHeight * rows.size() + 16, 16, 16);

        for (int i = 0; i < rows.size(); i++) {
            StandingLine row = rows.get(i);
            int y = top + 8 + i * rowHeight;
            int baseline = y + 35;
            if (i > 0) {
                g.setColor(BORDER);
                g.drawLine(left + 16, y, left + width - 16, y);
            }
            g.setFont(font(Font.BOLD, 24));
            g.setColor(row.position() == 1 ? new Color(0xfacc15) : MUTED);
            drawRight(g, String.valueOf(row.position()), left + 52, baseline);

            g.setColor(Color.decode(colors.hex(row.constructorId())));
            g.fillRoundRect(left + 66, y + 12, 6, 30, 3, 3);

            g.setColor(TEXT);
            g.setFont(font(Font.BOLD, 26));
            g.drawString(code(row), left + 88, baseline);

            g.setFont(font(Font.BOLD, 26));
            drawRight(g, points(row.points(), lang), left + width - 72, baseline);

            Integer change = row.positionChange();
            if (change != null && change != 0) {
                arrow(g, left + width - 40, y + 27, change > 0);
            }
        }
    }

    private static void arrow(Graphics2D g, int cx, int cy, boolean up) {
        g.setColor(up ? UP : DOWN);
        Polygon p = up
                ? new Polygon(new int[] { cx - 9, cx + 9, cx }, new int[] { cy + 7, cy + 7, cy - 8 }, 3)
                : new Polygon(new int[] { cx - 9, cx + 9, cx }, new int[] { cy - 7, cy - 7, cy + 8 }, 3);
        g.fillPolygon(p);
    }

    private static Graphics2D start(BufferedImage image) {
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_FRACTIONALMETRICS, RenderingHints.VALUE_FRACTIONALMETRICS_ON);
        g.setColor(BG);
        g.fillRect(0, 0, WIDTH, HEIGHT);
        return g;
    }

    private static void brand(Graphics2D g) {
        g.setColor(ACCENT);
        g.fillRoundRect(64, 58, 8, 40, 4, 4);
        g.setColor(TEXT);
        g.setFont(font(Font.BOLD, 34));
        g.drawString("AlterF1", 88, 90);
    }

    private static void footer(Graphics2D g, OgLanguage lang) {
        g.setColor(MUTED);
        g.setFont(font(Font.PLAIN, 20));
        g.drawString((lang == OgLanguage.TR ? "Veri" : "Data") + ": F1DB (CC BY 4.0)", 64, HEIGHT - 48);
    }

    private static Font font(int style, int size) {
        return new Font(Font.SANS_SERIF, style, size);
    }

    /** The largest size up to {@code max} at which {@code text} fits in {@code width}. */
    private static Font fitFont(Graphics2D g, String text, int style, int max, int width) {
        for (int size = max; size > 32; size -= 4) {
            Font f = font(style, size);
            if (g.getFontMetrics(f).stringWidth(text) <= width) {
                return f;
            }
        }
        return font(style, 32);
    }

    private static void drawRight(Graphics2D g, String text, int right, int baseline) {
        FontMetrics m = g.getFontMetrics();
        g.drawString(text, right - m.stringWidth(text), baseline);
    }

    private static String code(StandingLine row) {
        if (row.driverCode() != null && !row.driverCode().isBlank()) {
            return row.driverCode().toUpperCase(java.util.Locale.ROOT);
        }
        String s = surname(row.driverName()).replaceAll("[^A-Za-z]", "");
        return (s.length() > 3 ? s.substring(0, 3) : s).toUpperCase(java.util.Locale.ROOT);
    }

    static String surname(String fullName) {
        String[] parts = fullName.strip().split("\\s+", 2);
        return parts.length > 1 ? parts[1] : parts[0];
    }

    /** Up to two decimals, no trailing zeros; decimal comma in Turkish. */
    static String points(BigDecimal value, OgLanguage lang) {
        String plain = value.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
        return lang == OgLanguage.TR ? plain.replace('.', ',') : plain;
    }

    private static java.util.Locale localeOf(OgLanguage lang) {
        return lang == OgLanguage.TR ? java.util.Locale.forLanguageTag("tr") : java.util.Locale.ROOT;
    }

    private static byte[] png(BufferedImage image, Graphics2D g) {
        g.dispose();
        try (ByteArrayOutputStream out = new ByteArrayOutputStream(64 * 1024)) {
            ImageIO.write(image, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
