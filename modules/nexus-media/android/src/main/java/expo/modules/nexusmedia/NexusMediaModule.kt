package expo.modules.nexusmedia

import android.content.ContentUris
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

class NexusMediaModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NexusMedia")

    AsyncFunction("scanMusic") { limit: Int ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("NexusMedia requires an active React context")

      val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL)
      } else {
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
      }

      val projection = mutableListOf(
        MediaStore.Audio.Media._ID,
        MediaStore.Audio.Media.TITLE,
        MediaStore.Audio.Media.ARTIST,
        MediaStore.Audio.Media.ALBUM,
        MediaStore.Audio.Media.ALBUM_ID,
        MediaStore.Audio.Media.DURATION,
        MediaStore.Audio.Media.DATE_ADDED,
        MediaStore.Audio.Media.DISPLAY_NAME
      )
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        projection.add(MediaStore.Audio.Media.RELATIVE_PATH)
      }

      val result = mutableListOf<Map<String, Any?>>()
      val selection = "${MediaStore.Audio.Media.IS_MUSIC} != 0 AND ${MediaStore.Audio.Media.DURATION} > 10000"
      val sortOrder = "${MediaStore.Audio.Media.DATE_ADDED} DESC"

      context.contentResolver.query(
        collection,
        projection.toTypedArray(),
        selection,
        null,
        sortOrder
      )?.use { cursor ->
        val idColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
        val titleColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
        val artistColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ARTIST)
        val albumColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM)
        val albumIdColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.ALBUM_ID)
        val durationColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
        val dateAddedColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
        val displayColumn = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
        val folderColumn = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          cursor.getColumnIndex(MediaStore.Audio.Media.RELATIVE_PATH)
        } else -1

        while (cursor.moveToNext() && result.size < limit.coerceIn(1, 10000)) {
          val id = cursor.getLong(idColumn)
          val contentUri = ContentUris.withAppendedId(collection, id)
          val rawTitle = cursor.getString(titleColumn)
          val displayName = cursor.getString(displayColumn) ?: "Unknown track"
          val title = rawTitle?.takeIf { it.isNotBlank() && it != "<unknown>" }
            ?: displayName.substringBeforeLast('.')

          result.add(
            mapOf(
              "id" to id.toString(),
              "uri" to contentUri.toString(),
              "title" to title,
              "artist" to cleanUnknown(cursor.getString(artistColumn), "Unknown artist"),
              "album" to cleanUnknown(cursor.getString(albumColumn), "Unknown album"),
              "albumId" to cursor.getLong(albumIdColumn).toString(),
              "durationMs" to cursor.getLong(durationColumn),
              "dateAdded" to cursor.getLong(dateAddedColumn) * 1000L,
              "displayName" to displayName,
              "folder" to if (folderColumn >= 0) cursor.getString(folderColumn) else null
            )
          )
        }
      }
      result
    }

    AsyncFunction("resolveArtwork") { uri: String, cacheKey: String ->
      val context = appContext.reactContext
        ?: throw IllegalStateException("NexusMedia requires an active React context")
      val cacheDir = File(context.cacheDir, "nexus-artwork").apply { mkdirs() }
      val safeKey = cacheKey.replace(Regex("[^A-Za-z0-9._-]"), "_")
      val imageFile = File(cacheDir, "$safeKey.jpg")
      val paletteFile = File(cacheDir, "$safeKey.palette")

      if (imageFile.exists() && paletteFile.exists()) {
        return@AsyncFunction mapOf(
          "artworkUri" to Uri.fromFile(imageFile).toString(),
          "palette" to paletteFile.readLines().filter { it.isNotBlank() }
        )
      }

      val retriever = MediaMetadataRetriever()
      try {
        retriever.setDataSource(context, Uri.parse(uri))
        val bytes = retriever.embeddedPicture
        if (bytes == null || bytes.isEmpty()) {
          return@AsyncFunction mapOf(
            "artworkUri" to null,
            "palette" to fallbackPalette(cacheKey)
          )
        }

        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeByteArray(bytes, 0, bytes.size, options)
        var sample = 1
        while (max(options.outWidth / sample, options.outHeight / sample) > 1024) {
          sample *= 2
        }
        val decodeOptions = BitmapFactory.Options().apply { inSampleSize = sample }
        val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size, decodeOptions)
          ?: return@AsyncFunction mapOf(
            "artworkUri" to null,
            "palette" to fallbackPalette(cacheKey)
          )

        val palette = extractPalette(bitmap)
        FileOutputStream(imageFile).use { stream ->
          bitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
        }
        paletteFile.writeText(palette.joinToString("\n"))
        if (!bitmap.isRecycled) bitmap.recycle()

        mapOf(
          "artworkUri" to Uri.fromFile(imageFile).toString(),
          "palette" to palette
        )
      } finally {
        retriever.release()
      }
    }

    AsyncFunction("clearArtworkCache") {
      val context = appContext.reactContext
        ?: throw IllegalStateException("NexusMedia requires an active React context")
      File(context.cacheDir, "nexus-artwork").deleteRecursively()
    }
  }

  private fun cleanUnknown(value: String?, fallback: String): String {
    return value?.takeIf { it.isNotBlank() && it != "<unknown>" } ?: fallback
  }

  private fun extractPalette(bitmap: Bitmap): List<String> {
    val buckets = HashMap<Int, Int>()
    val step = max(1, sqrt((bitmap.width * bitmap.height / 12000.0).coerceAtLeast(1.0)).toInt())
    var y = 0
    while (y < bitmap.height) {
      var x = 0
      while (x < bitmap.width) {
        val pixel = bitmap.getPixel(x, y)
        val alpha = (pixel ushr 24) and 0xff
        if (alpha > 180) {
          val r = (pixel ushr 16) and 0xff
          val g = (pixel ushr 8) and 0xff
          val b = pixel and 0xff
          val maxChannel = max(r, max(g, b))
          val minChannel = min(r, min(g, b))
          val luminance = (r * 2126 + g * 7152 + b * 722) / 10000
          if (luminance in 18..242 && (maxChannel - minChannel > 8 || luminance in 45..205)) {
            val key = ((r shr 4) shl 8) or ((g shr 4) shl 4) or (b shr 4)
            buckets[key] = (buckets[key] ?: 0) + 1
          }
        }
        x += step
      }
      y += step
    }

    val chosen = mutableListOf<IntArray>()
    buckets.entries.sortedByDescending { it.value }.forEach { entry ->
      if (chosen.size >= 5) return@forEach
      val qr = (entry.key shr 8) and 0x0f
      val qg = (entry.key shr 4) and 0x0f
      val qb = entry.key and 0x0f
      val candidate = intArrayOf(qr * 17, qg * 17, qb * 17)
      val distinct = chosen.all { color ->
        val dr = candidate[0] - color[0]
        val dg = candidate[1] - color[1]
        val db = candidate[2] - color[2]
        sqrt((dr * dr + dg * dg + db * db).toDouble()) > 52
      }
      if (distinct) chosen.add(candidate)
    }

    val fallback = listOf("#A58A78", "#667582", "#29343E", "#0A0D10", "#D0B496")
    if (chosen.size < 3) return fallback

    return chosen.map { color ->
      String.format("#%02X%02X%02X", color[0], color[1], color[2])
    }
  }

  private fun fallbackPalette(seed: String): List<String> {
    val hash = seed.hashCode()
    val base = (hash and 0x00ffffff) or 0x303030
    val r = (base shr 16) and 0xff
    val g = (base shr 8) and 0xff
    val b = base and 0xff
    fun c(rr: Int, gg: Int, bb: Int) =
      String.format("#%02X%02X%02X", rr.coerceIn(0,255), gg.coerceIn(0,255), bb.coerceIn(0,255))
    return listOf(
      c(r, g, b),
      c((r + 55) / 2, (g + 70) / 2, (b + 85) / 2),
      c(r / 3, g / 3, b / 3),
      "#090C0F",
      c(min(255, r + 42), min(255, g + 34), min(255, b + 28))
    )
  }
}
