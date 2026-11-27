package com.msheker.alterf1.og;

/** Link-preview wording in the two site languages (the frontend's en.json / tr.json for the same ideas). */
public enum OgLanguage {

    EN("en", "en_US") {
        @Override
        String rules(String system) {
            return "custom".equals(system) ? "custom rules" : system + " rules";
        }

        @Override
        String changedTitle(int season, String system, String champion, String real) {
            return "%d under %s: %s, not %s".formatted(season, rules(system), champion, real);
        }

        @Override
        String sameTitle(int season, String system, String champion) {
            return "%d under %s: %s is still champion".formatted(season, rules(system), champion);
        }

        @Override
        String tagline() {
            return "Replay every Formula 1 season since 1950 under five historical points systems.";
        }

        @Override
        String homeTitle() {
            return "Same races. Different rules.";
        }

        @Override
        String homeAccent() {
            return "A different champion.";
        }

        @Override
        String changedKicker() {
            return "CHAMPION CHANGED";
        }

        @Override
        String sameKicker() {
            return "SAME CHAMPION";
        }

        @Override
        String insteadOf(String real) {
            return "instead of " + real;
        }

        @Override
        String realChampionWas() {
            return "as in the real season";
        }

        @Override
        String scenarioNote() {
            return "with a what-if scenario";
        }
    },

    TR("tr", "tr_TR") {
        @Override
        String rules(String system) {
            return "custom".equals(system) ? "özel kurallar" : system + " kuralları";
        }

        @Override
        String changedTitle(int season, String system, String champion, String real) {
            return "%d, %s: %s değil %s".formatted(season, withRules(system), real, champion);
        }

        @Override
        String sameTitle(int season, String system, String champion) {
            return "%d, %s: şampiyon yine %s".formatted(season, withRules(system), champion);
        }

        private String withRules(String system) {
            return "custom".equals(system) ? "özel kurallarla" : system + " kurallarıyla";
        }

        @Override
        String tagline() {
            return "1950'den bu yana her Formula 1 sezonunu beş tarihsel puan sistemiyle yeniden hesapla.";
        }

        @Override
        String homeTitle() {
            return "Aynı yarışlar. Farklı kurallar.";
        }

        @Override
        String homeAccent() {
            return "Başka bir şampiyon.";
        }

        @Override
        String changedKicker() {
            return "ŞAMPİYON DEĞİŞTİ";
        }

        @Override
        String sameKicker() {
            return "ŞAMPİYON AYNI";
        }

        @Override
        String insteadOf(String real) {
            return real + " yerine";
        }

        @Override
        String realChampionWas() {
            return "gerçek sezondaki gibi";
        }

        @Override
        String scenarioNote() {
            return "senaryo değişikliğiyle";
        }
    };

    private final String code;
    private final String locale;

    OgLanguage(String code, String locale) {
        this.code = code;
        this.locale = locale;
    }

    public String code() {
        return code;
    }

    public String locale() {
        return locale;
    }

    public static OgLanguage of(String code) {
        return "tr".equals(code) ? TR : EN;
    }

    abstract String rules(String system);

    abstract String changedTitle(int season, String system, String champion, String real);

    abstract String sameTitle(int season, String system, String champion);

    abstract String tagline();

    abstract String homeTitle();

    abstract String homeAccent();

    abstract String changedKicker();

    abstract String sameKicker();

    abstract String insteadOf(String real);

    abstract String realChampionWas();

    abstract String scenarioNote();
}
