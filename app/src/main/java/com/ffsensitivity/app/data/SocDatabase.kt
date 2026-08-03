package com.ffsensitivity.app.data

/**
 * Maps SoC / platform codes to brand + marketing name.
 * Lookup is exact / longest-code only — never guesses a wrong Snapdragon name.
 */
object SocDatabase {

    data class SocInfo(val brand: String, val type: String)

    fun lookup(rawCode: String?): SocInfo? {
        if (rawCode.isNullOrBlank()) return null
        // Prefer explicit chip-code tokens extracted from noisy OEM strings.
        for (token in extractCodes(rawCode)) {
            SOC_BY_KEY[token]?.let { return it }
        }
        val key = normalize(rawCode) ?: return null
        SOC_BY_KEY[key]?.let { return it }
        // Longest known key that is a full token inside the normalized string.
        var bestKey: String? = null
        var bestInfo: SocInfo? = null
        for ((k, info) in SOC_BY_KEY) {
            if (k.length < 5) continue
            if (!key.contains(k)) continue
            // Require chip-code boundary feel: match whole code, not short prefix.
            if (bestKey == null || k.length > bestKey.length) {
                bestKey = k
                bestInfo = info
            }
        }
        return bestInfo
    }

    fun normalize(raw: String?): String? {
        if (raw.isNullOrBlank()) return null
        return raw.lowercase()
            .replace("qualcomm technologies, inc.", "")
            .replace("qualcomm technologies inc", "")
            .replace("qualcomm", "")
            .replace("mediatek", "")
            .replace("samsung electronics", "")
            .replace("samsung", "")
            .replace(" ", "")
            .replace("-", "")
            .replace("_", "")
            .replace(".", "")
            .trim()
            .takeIf { it.isNotBlank() }
    }

    /** Pull canonical SoC codes out of OEM strings like "SM8550-AB" / "mt6895v/za". */
    fun extractCodes(raw: String): List<String> {
        val lower = raw.lowercase()
        val patterns = listOf(
            Regex("""sm\d{4}"""),
            Regex("""sdm\d{3,4}"""),
            Regex("""msm\d{4}"""),
            Regex("""mt\d{4}[a-z]?"""),
            Regex("""s5e\d{4}"""),
            Regex("""exynos\d{3,4}"""),
            Regex("""gs\d{3}"""),
            Regex("""ums\d{4}[a-z]?"""),
            Regex("""\bt6\d{2}\b"""),
            Regex("""\bt7\d{2}\b"""),
            Regex("""\bt8\d{2}\b""")
        )
        val found = linkedSetOf<String>()
        for (p in patterns) {
            p.findAll(lower).forEach { found.add(it.value) }
        }
        // Prefer longer / more specific codes first (mt6877v before mt6877)
        return found.sortedByDescending { it.length }
    }

    private val SOC_BY_KEY: Map<String, SocInfo> = mapOf(
        "atoll" to SocInfo("Qualcomm", "Snapdragon 720G"),
        "bengal" to SocInfo("Qualcomm", "Snapdragon 662"),
        "blair" to SocInfo("Qualcomm", "Snapdragon 4 Gen 1"),
        "exynos1080" to SocInfo("Samsung", "Exynos 1080"),
        "exynos1280" to SocInfo("Samsung", "Exynos 1280"),
        "exynos1330" to SocInfo("Samsung", "Exynos 1330"),
        "exynos1380" to SocInfo("Samsung", "Exynos 1380"),
        "exynos1480" to SocInfo("Samsung", "Exynos 1480"),
        "exynos1580" to SocInfo("Samsung", "Exynos 1580"),
        "exynos2100" to SocInfo("Samsung", "Exynos 2100"),
        "exynos2200" to SocInfo("Samsung", "Exynos 2200"),
        "exynos2400" to SocInfo("Samsung", "Exynos 2400"),
        "exynos2500" to SocInfo("Samsung", "Exynos 2500"),
        "exynos850" to SocInfo("Samsung", "Exynos 850"),
        "exynos880" to SocInfo("Samsung", "Exynos 880"),
        "exynos9609" to SocInfo("Samsung", "Exynos 9609"),
        "exynos9610" to SocInfo("Samsung", "Exynos 9610"),
        "exynos9611" to SocInfo("Samsung", "Exynos 9611"),
        "exynos980" to SocInfo("Samsung", "Exynos 980"),
        "exynos9820" to SocInfo("Samsung", "Exynos 9820"),
        "exynos9825" to SocInfo("Samsung", "Exynos 9825"),
        "exynos990" to SocInfo("Samsung", "Exynos 990"),
        "gs101" to SocInfo("Google", "Google Tensor"),
        "gs201" to SocInfo("Google", "Google Tensor G2"),
        "holi" to SocInfo("Qualcomm", "Snapdragon 695"),
        "kalama" to SocInfo("Qualcomm", "Snapdragon 8 Gen 2"),
        "khaje" to SocInfo("Qualcomm", "Snapdragon 680"),
        "kona" to SocInfo("Qualcomm", "Snapdragon 865"),
        "lahaina" to SocInfo("Qualcomm", "Snapdragon 888"),
        "lito" to SocInfo("Qualcomm", "Snapdragon 765G"),
        "msm8953" to SocInfo("Qualcomm", "Snapdragon 625"),
        "msm8976" to SocInfo("Qualcomm", "Snapdragon 652"),
        "msm8996" to SocInfo("Qualcomm", "Snapdragon 820"),
        "msm8998" to SocInfo("Qualcomm", "Snapdragon 835"),
        "mt6761" to SocInfo("MediaTek", "Helio A22"),
        "mt6762" to SocInfo("MediaTek", "Helio P22"),
        "mt6763" to SocInfo("MediaTek", "Helio P23"),
        "mt6765" to SocInfo("MediaTek", "Helio P35"),
        "mt6768" to SocInfo("MediaTek", "Helio G85"),
        "mt6769" to SocInfo("MediaTek", "Helio G80"),
        "mt6769t" to SocInfo("MediaTek", "Helio G80"),
        "mt6769z" to SocInfo("MediaTek", "Helio G85"),
        "mt6771" to SocInfo("MediaTek", "Helio P60"),
        "mt6779" to SocInfo("MediaTek", "Helio P90"),
        "mt6781" to SocInfo("MediaTek", "Helio G96"),
        "mt6785" to SocInfo("MediaTek", "Helio G90T"),
        "mt6789" to SocInfo("MediaTek", "Helio G99"),
        "mt6799" to SocInfo("MediaTek", "Helio X30"),
        "mt6833" to SocInfo("MediaTek", "Dimensity 700"),
        "mt6833p" to SocInfo("MediaTek", "Dimensity 700"),
        "mt6835" to SocInfo("MediaTek", "Dimensity 7025"),
        "mt6853" to SocInfo("MediaTek", "Dimensity 720"),
        "mt6855" to SocInfo("MediaTek", "Dimensity 7020"),
        "mt6873" to SocInfo("MediaTek", "Dimensity 800U"),
        "mt6875" to SocInfo("MediaTek", "Dimensity 820"),
        "mt6877" to SocInfo("MediaTek", "Dimensity 900"),
        "mt6877t" to SocInfo("MediaTek", "Dimensity 1080"),
        "mt6877v" to SocInfo("MediaTek", "Dimensity 1080"),
        "mt6878" to SocInfo("MediaTek", "Dimensity 7300"),
        "mt6879" to SocInfo("MediaTek", "Dimensity 7020"),
        "mt6883" to SocInfo("MediaTek", "Dimensity 1000L"),
        "mt6885" to SocInfo("MediaTek", "Dimensity 1000"),
        "mt6886" to SocInfo("MediaTek", "Dimensity 7200"),
        "mt6889" to SocInfo("MediaTek", "Dimensity 1000+"),
        "mt6891" to SocInfo("MediaTek", "Dimensity 1100"),
        "mt6893" to SocInfo("MediaTek", "Dimensity 1200"),
        "mt6895" to SocInfo("MediaTek", "Dimensity 8100"),
        "mt6895z" to SocInfo("MediaTek", "Dimensity 8100"),
        "mt6896" to SocInfo("MediaTek", "Dimensity 8200"),
        "mt6897" to SocInfo("MediaTek", "Dimensity 8300"),
        "mt6899" to SocInfo("MediaTek", "Dimensity 8400"),
        "mt6980" to SocInfo("MediaTek", "Dimensity 9200"),
        "mt6983" to SocInfo("MediaTek", "Dimensity 9000"),
        "mt6985" to SocInfo("MediaTek", "Dimensity 9200+"),
        "mt6989" to SocInfo("MediaTek", "Dimensity 9300"),
        "mt6991" to SocInfo("MediaTek", "Dimensity 9400"),
        "mt6991z" to SocInfo("MediaTek", "Dimensity 9400+"),
        "pineapple" to SocInfo("Qualcomm", "Snapdragon 8 Gen 3"),
        "raviole" to SocInfo("Google", "Google Tensor"),
        "ripcurrent" to SocInfo("Google", "Google Tensor G3"),
        "ripcurrentpro" to SocInfo("Google", "Google Tensor G4"),
        "s5e8535" to SocInfo("Samsung", "Exynos 1330"),
        "s5e8825" to SocInfo("Samsung", "Exynos 1280"),
        "s5e8835" to SocInfo("Samsung", "Exynos 1380"),
        "s5e8845" to SocInfo("Samsung", "Exynos 1480"),
        "s5e8855" to SocInfo("Samsung", "Exynos 1580"),
        "s5e9840" to SocInfo("Samsung", "Exynos 1080"),
        "s5e9925" to SocInfo("Samsung", "Exynos 2200"),
        "s5e9945" to SocInfo("Samsung", "Exynos 2400"),
        "s5e9955" to SocInfo("Samsung", "Exynos 2500"),
        "sdm450" to SocInfo("Qualcomm", "Snapdragon 450"),
        "sdm630" to SocInfo("Qualcomm", "Snapdragon 630"),
        "sdm636" to SocInfo("Qualcomm", "Snapdragon 636"),
        "sdm660" to SocInfo("Qualcomm", "Snapdragon 660"),
        "sdm670" to SocInfo("Qualcomm", "Snapdragon 670"),
        "sdm710" to SocInfo("Qualcomm", "Snapdragon 710"),
        "sdm712" to SocInfo("Qualcomm", "Snapdragon 712"),
        "sdm845" to SocInfo("Qualcomm", "Snapdragon 845"),
        "sdm855" to SocInfo("Qualcomm", "Snapdragon 855"),
        "shima" to SocInfo("Qualcomm", "Snapdragon 780G"),
        "sm4350" to SocInfo("Qualcomm", "Snapdragon 480"),
        "sm4375" to SocInfo("Qualcomm", "Snapdragon 4 Gen 1"),
        "sm4450" to SocInfo("Qualcomm", "Snapdragon 4 Gen 2"),
        "sm4635" to SocInfo("Qualcomm", "Snapdragon 4s Gen 2"),
        "sm6115" to SocInfo("Qualcomm", "Snapdragon 662"),
        "sm6125" to SocInfo("Qualcomm", "Snapdragon 665"),
        "sm6150" to SocInfo("Qualcomm", "Snapdragon 675"),
        "sm6225" to SocInfo("Qualcomm", "Snapdragon 680"),
        "sm6350" to SocInfo("Qualcomm", "Snapdragon 690"),
        "sm6375" to SocInfo("Qualcomm", "Snapdragon 695"),
        "sm6450" to SocInfo("Qualcomm", "Snapdragon 6 Gen 1"),
        "sm6475" to SocInfo("Qualcomm", "Snapdragon 6 Gen 3"),
        "sm7125" to SocInfo("Qualcomm", "Snapdragon 720G"),
        "sm7150" to SocInfo("Qualcomm", "Snapdragon 732G"),
        "sm7225" to SocInfo("Qualcomm", "Snapdragon 750G"),
        "sm7250" to SocInfo("Qualcomm", "Snapdragon 765G"),
        "sm7325" to SocInfo("Qualcomm", "Snapdragon 778G"),
        "sm7350" to SocInfo("Qualcomm", "Snapdragon 780G"),
        "sm7435" to SocInfo("Qualcomm", "Snapdragon 7s Gen 2"),
        "sm7450" to SocInfo("Qualcomm", "Snapdragon 7 Gen 1"),
        "sm7475" to SocInfo("Qualcomm", "Snapdragon 7+ Gen 2"),
        "sm7550" to SocInfo("Qualcomm", "Snapdragon 7 Gen 3"),
        "sm7635" to SocInfo("Qualcomm", "Snapdragon 7s Gen 3"),
        "sm7675" to SocInfo("Qualcomm", "Snapdragon 7+ Gen 3"),
        "sm8150" to SocInfo("Qualcomm", "Snapdragon 855"),
        "sm8250" to SocInfo("Qualcomm", "Snapdragon 865"),
        "sm8350" to SocInfo("Qualcomm", "Snapdragon 888"),
        "sm8450" to SocInfo("Qualcomm", "Snapdragon 8 Gen 1"),
        "sm8475" to SocInfo("Qualcomm", "Snapdragon 8+ Gen 1"),
        "sm8550" to SocInfo("Qualcomm", "Snapdragon 8 Gen 2"),
        "sm8635" to SocInfo("Qualcomm", "Snapdragon 8s Gen 3"),
        "sm8650" to SocInfo("Qualcomm", "Snapdragon 8 Gen 3"),
        "sm8735" to SocInfo("Qualcomm", "Snapdragon 8s Gen 4"),
        "sm8750" to SocInfo("Qualcomm", "Snapdragon 8 Elite"),
        "sun" to SocInfo("Qualcomm", "Snapdragon 8 Elite"),
        "t606" to SocInfo("Unisoc", "Unisoc T606"),
        "t610" to SocInfo("Unisoc", "Unisoc T610"),
        "t612" to SocInfo("Unisoc", "Unisoc T612"),
        "t616" to SocInfo("Unisoc", "Unisoc T616"),
        "t700" to SocInfo("Unisoc", "Unisoc T700"),
        "t760" to SocInfo("Unisoc", "Unisoc T760"),
        "t820" to SocInfo("Unisoc", "Unisoc T820"),
        "taro" to SocInfo("Qualcomm", "Snapdragon 8 Gen 1"),
        "tensor" to SocInfo("Google", "Google Tensor"),
        "trinket" to SocInfo("Qualcomm", "Snapdragon 665"),
        "ums512" to SocInfo("Unisoc", "Unisoc T618"),
        "ums9230" to SocInfo("Unisoc", "Unisoc T606"),
        "ums9230e" to SocInfo("Unisoc", "Unisoc T616"),
        "ums9620" to SocInfo("Unisoc", "Unisoc T612"),
        "yupik" to SocInfo("Qualcomm", "Snapdragon 778G"),
        "zuma" to SocInfo("Google", "Google Tensor G3"),
        "zumapro" to SocInfo("Google", "Google Tensor G4")
    )
}
