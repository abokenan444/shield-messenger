package com.shieldmessenger.documents

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Log
import android.webkit.MimeTypeMap
import java.io.ByteArrayOutputStream

/**
 * Enhanced document handling for Shield Messenger.
 *
 * Provides proper document metadata extraction, MIME type detection,
 * and chunked reading for large files. Fixes the wire type conflict
 * where FILE (0x0F) collided with PROFILE_UPDATE.
 *
 * Wire type: 0x11 (DOCUMENT)
 * Format: [0x11][metadataLen:2][metadata JSON][fileBytes...]
 *
 * Metadata JSON: {"name":"file.pdf","size":12345,"mime":"application/pdf"}
 */
class DocumentSender(private val context: Context) {

    companion object {
        private const val TAG = "DocumentSender"
        const val WIRE_TYPE_DOCUMENT: Byte = 0x11
        const val MAX_DOCUMENT_SIZE = 25 * 1024 * 1024 // 25MB max
        const val CHUNK_SIZE = 512 * 1024 // 512KB read chunks
    }

    data class DocumentInfo(
        val name: String,
        val size: Long,
        val mimeType: String,
        val data: ByteArray,
        val extension: String
    )

    /**
     * Read a document from a content URI and extract metadata.
     */
    fun readDocument(uri: Uri): DocumentInfo? {
        try {
            // Get file name and size from content resolver
            var fileName = "document"
            var fileSize = 0L

            context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    val sizeIndex = cursor.getColumnIndex(OpenableColumns.SIZE)
                    if (nameIndex >= 0) fileName = cursor.getString(nameIndex) ?: "document"
                    if (sizeIndex >= 0) fileSize = cursor.getLong(sizeIndex)
                }
            }

            // Get MIME type
            val mimeType = context.contentResolver.getType(uri) ?: "application/octet-stream"

            // Get extension
            val extension = MimeTypeMap.getSingleton()
                .getExtensionFromMimeType(mimeType)
                ?: fileName.substringAfterLast('.', "bin")

            // Read file data in chunks (battery-friendly: avoids large allocations)
            val data = readFileChunked(uri) ?: return null

            if (data.size > MAX_DOCUMENT_SIZE) {
                Log.w(TAG, "Document too large: ${data.size} bytes (max $MAX_DOCUMENT_SIZE)")
                return null
            }

            Log.i(TAG, "Document read: '$fileName' (${data.size} bytes, $mimeType)")
            return DocumentInfo(fileName, data.size.toLong(), mimeType, data, extension)

        } catch (e: Exception) {
            Log.e(TAG, "Failed to read document: ${e.message}", e)
            return null
        }
    }

    /**
     * Build the wire payload for a document message.
     * Format: [0x11][metadataLen:2][metadata JSON UTF-8][fileBytes]
     */
    fun buildWirePayload(doc: DocumentInfo): ByteArray {
        val metadata = """{"name":"${escapeJson(doc.name)}","size":${doc.size},"mime":"${escapeJson(doc.mimeType)}"}"""
        val metaBytes = metadata.toByteArray(Charsets.UTF_8)

        val payload = ByteArray(1 + 2 + metaBytes.size + doc.data.size)
        payload[0] = WIRE_TYPE_DOCUMENT
        payload[1] = ((metaBytes.size shr 8) and 0xFF).toByte()
        payload[2] = (metaBytes.size and 0xFF).toByte()
        System.arraycopy(metaBytes, 0, payload, 3, metaBytes.size)
        System.arraycopy(doc.data, 0, payload, 3 + metaBytes.size, doc.data.size)

        return payload
    }

    /**
     * Parse metadata from a received document wire payload.
     */
    fun parseWirePayload(payload: ByteArray): DocumentInfo? {
        if (payload.size < 4 || payload[0] != WIRE_TYPE_DOCUMENT) return null

        val metaLen = ((payload[1].toInt() and 0xFF) shl 8) or (payload[2].toInt() and 0xFF)
        if (3 + metaLen > payload.size) return null

        val metaJson = String(payload, 3, metaLen, Charsets.UTF_8)
        val fileData = payload.copyOfRange(3 + metaLen, payload.size)

        // Parse JSON manually (avoid adding a JSON library dependency)
        val name = extractJsonString(metaJson, "name") ?: "document"
        val mime = extractJsonString(metaJson, "mime") ?: "application/octet-stream"
        val size = extractJsonLong(metaJson, "size") ?: fileData.size.toLong()
        val ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mime) ?: "bin"

        return DocumentInfo(name, size, mime, fileData, ext)
    }

    /**
     * Get a human-readable file size string.
     */
    fun formatFileSize(bytes: Long): String = when {
        bytes < 1024 -> "$bytes B"
        bytes < 1024 * 1024 -> "${bytes / 1024} KB"
        else -> String.format("%.1f MB", bytes / (1024.0 * 1024.0))
    }

    /**
     * Get an icon resource name based on MIME type.
     */
    fun getDocumentIcon(mimeType: String): String = when {
        mimeType.startsWith("application/pdf") -> "ic_document_pdf"
        mimeType.startsWith("image/") -> "ic_document_image"
        mimeType.startsWith("video/") -> "ic_document_video"
        mimeType.startsWith("audio/") -> "ic_document_audio"
        mimeType.contains("word") || mimeType.contains("document") -> "ic_document_word"
        mimeType.contains("sheet") || mimeType.contains("excel") -> "ic_document_excel"
        mimeType.contains("zip") || mimeType.contains("compressed") -> "ic_document_archive"
        mimeType.startsWith("text/") -> "ic_document_text"
        else -> "ic_document_generic"
    }

    /**
     * Read file in chunks to avoid large memory allocations.
     */
    private fun readFileChunked(uri: Uri): ByteArray? {
        return try {
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                val buffer = ByteArrayOutputStream()
                val chunk = ByteArray(CHUNK_SIZE)
                var totalRead = 0
                var bytesRead: Int

                while (inputStream.read(chunk).also { bytesRead = it } != -1) {
                    totalRead += bytesRead
                    if (totalRead > MAX_DOCUMENT_SIZE) {
                        Log.w(TAG, "Document exceeds max size during read")
                        return null
                    }
                    buffer.write(chunk, 0, bytesRead)
                }

                buffer.toByteArray()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read file: ${e.message}", e)
            null
        }
    }

    private fun escapeJson(s: String): String =
        s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")

    private fun extractJsonString(json: String, key: String): String? {
        val pattern = """"$key"\s*:\s*"((?:[^"\\]|\\.)*)"""
        return Regex(pattern).find(json)?.groupValues?.get(1)
            ?.replace("\\\"", "\"")?.replace("\\\\", "\\")?.replace("\\n", "\n")
    }

    private fun extractJsonLong(json: String, key: String): Long? {
        val pattern = """"$key"\s*:\s*(\d+)"""
        return Regex(pattern).find(json)?.groupValues?.get(1)?.toLongOrNull()
    }
}
