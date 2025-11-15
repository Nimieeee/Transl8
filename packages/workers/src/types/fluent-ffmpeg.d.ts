// Type declaration for fluent-ffmpeg
// This allows workers to compile backend files that use fluent-ffmpeg
declare module 'fluent-ffmpeg' {
  const ffmpeg: any;
  export = ffmpeg;
}
