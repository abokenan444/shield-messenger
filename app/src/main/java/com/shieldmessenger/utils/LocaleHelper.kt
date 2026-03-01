package com.shieldmessenger.utils

import android.content.Context
import android.content.res.Configuration
import java.util.Locale

object LocaleHelper {

    private const val PREFS_NAME = "language_prefs"
    private const val KEY_LANGUAGE = "selected_language"

    data class LanguageOption(val code: String, val name: String)

    val supportedLanguages = listOf(
        LanguageOption("en", "English"),
        LanguageOption("ar", "العربية"),
        LanguageOption("fr", "Français"),
        LanguageOption("es", "Español"),
        LanguageOption("de", "Deutsch"),
        LanguageOption("tr", "Türkçe"),
        LanguageOption("fa", "فارسی"),
        LanguageOption("ur", "اردو"),
        LanguageOption("zh", "中文"),
        LanguageOption("ja", "日本語"),
        LanguageOption("ko", "한국어"),
        LanguageOption("ru", "Русский"),
        LanguageOption("pt", "Português"),
        LanguageOption("it", "Italiano"),
        LanguageOption("hi", "हिन्दी"),
        LanguageOption("id", "Bahasa Indonesia"),
        LanguageOption("nl", "Nederlands")
    )

    fun getSavedLanguage(context: Context): String {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_LANGUAGE, "en") ?: "en"
    }

    fun saveLanguage(context: Context, languageCode: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_LANGUAGE, languageCode)
            .apply()
    }

    fun getLanguageName(code: String): String {
        return supportedLanguages.find { it.code == code }?.name ?: "English"
    }

    fun applyLocale(context: Context): Context {
        val languageCode = getSavedLanguage(context)
        val locale = Locale(languageCode)
        Locale.setDefault(locale)
        val config = Configuration(context.resources.configuration)
        config.setLocale(locale)
        config.setLayoutDirection(locale)
        return context.createConfigurationContext(config)
    }
}
