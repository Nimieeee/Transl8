# Video Format Support Update

## Changes Made

Added support for multiple video formats beyond MP4.

### Supported Formats

- ✅ **MP4** (video/mp4)
- ✅ **MOV** (video/quicktime)
- ✅ **MKV** (video/x-matroska)
- ✅ **AVI** (video/x-msvideo)

### Frontend Changes

**File:** `packages/frontend/src/app/upload/page.tsx`

1. **File validation updated:**
   - Added support for MOV, MKV, and AVI MIME types
   - Added extension-based validation as fallback
   - Better error messages

2. **UI text updated:**
   - Labels now show all supported formats
   - Help text mentions all formats

3. **File input accept attribute:**
   - Added all MIME types and extensions

### Backend Changes

**File:** `packages/backend/src/routes/dub.ts`

1. **Multer file filter updated:**
   - Added MIME types for MOV, MKV, and AVI
   - Added extension-based validation as fallback
   - Better error messages

### Documentation Updates

Updated the following files:
- `MVP_READY.md`
- `TEST_UPLOAD.md`

## Testing

To test the new formats:

1. Open http://localhost:3000
2. Try uploading:
   - An MP4 file ✅
   - A MOV file ✅
   - An MKV file ✅
   - An AVI file ✅

All formats should be accepted and processed.

## Technical Notes

### MIME Types

Different browsers and systems may report different MIME types for the same file format:

- **MOV**: `video/quicktime` or `video/x-quicktime`
- **MKV**: `video/x-matroska` or `video/matroska`
- **AVI**: `video/x-msvideo` or `video/avi`

The validation checks both MIME type and file extension to handle these variations.

### File Size Limit

All formats are subject to the same 100MB file size limit.

### Processing

All video formats will be processed through the same dubbing pipeline:
1. Video uploaded
2. Audio extracted
3. Speech-to-text
4. Translation
5. Text-to-speech
6. Lip sync
7. Audio merged back to video

The output will always be in MP4 format for consistency.

## Future Enhancements

Consider adding:
- WebM support
- FLV support
- Automatic format conversion
- Format-specific optimization
- Preview before upload
