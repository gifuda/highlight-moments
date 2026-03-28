/* ============================================
   图片/视频处理
   压缩、缩略图生成、预览 URL 管理
   ============================================ */

const Media = {
  MAX_IMAGE_SIZE: 2048,        // 图片最大宽度（像素）
  THUMBNAIL_SIZE: 400,          // 缩略图宽度
  JPEG_QUALITY: 0.8,            // JPEG 压缩质量
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 单文件最大 20MB

  /* 处理图片文件 */
  async processImage(file) {
    // 读取原始图片
    const img = await this._loadImage(file);

    // 计算尺寸（保持比例，宽不超过 MAX）
    let { width, height } = img;
    if (width > this.MAX_IMAGE_SIZE) {
      height = Math.round(height * (this.MAX_IMAGE_SIZE / width));
      width = this.MAX_IMAGE_SIZE;
    }

    // 压缩并生成主图
    const blob = await this._canvasToBlob(img, width, height, 'image/jpeg', this.JPEG_QUALITY);

    // 生成缩略图
    const thumbW = Math.min(this.THUMBNAIL_SIZE, width);
    const thumbH = Math.round(height * (thumbW / width));
    const thumbnail = await this._canvasToBlob(img, thumbW, thumbH, 'image/jpeg', 0.7);

    return {
      blob,
      thumbnail,
      width,
      height,
      mimeType: 'image/jpeg'
    };
  },

  /* 处理视频文件（存原始文件 + 生成封面缩略图） */
  async processVideo(file) {
    // 生成视频封面缩略图
    const thumbnail = await this._extractVideoFrame(file);
    let width = 0, height = 0;

    // 获取视频尺寸
    try {
      const { videoWidth, videoHeight } = await this._getVideoMeta(file);
      width = videoWidth;
      height = videoHeight;
    } catch { /* 获取失败就用默认值 */ }

    return {
      blob: file,
      thumbnail,
      width,
      height,
      mimeType: file.type
    };
  },

  /* 保存附件到 IndexedDB 并返回附件元数据 */
  async saveAttachment(file) {
    const id = Utils.uuid();
    const isVideo = file.type.startsWith('video/');

    // 警告大文件
    if (file.size > this.MAX_FILE_SIZE) {
      Utils.toast(`文件较大 (${Utils.formatSize(file.size)})，可能需要较长时间保存`);
    }

    let result;
    if (isVideo) {
      result = await this.processVideo(file);
    } else {
      result = await this.processImage(file);
    }

    // 保存主文件
    await Store.saveBlob(id, result.blob, isVideo ? 'video' : 'image');

    // 保存缩略图
    const thumbId = Utils.uuid();
    if (result.thumbnail) {
      await Store.saveBlob(thumbId, result.thumbnail, 'thumbnail');
    }

    return {
      id: Utils.uuid(),
      type: isVideo ? 'video' : 'image',
      fileName: file.name,
      size: file.size,
      mediaId: id,
      thumbnailMediaId: result.thumbnail ? thumbId : null,
      width: result.width,
      height: result.height,
      mimeType: result.mimeType
    };
  },

  /* 获取缩略图或主图的 Blob URL */
  async getMediaUrl(attachment) {
    // 优先加载缩略图（快速显示）
    const blob = attachment.thumbnailMediaId
      ? await Store.getBlob(attachment.thumbnailMediaId)
      : await Store.getBlob(attachment.mediaId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },

  /* 获取完整大图/视频的 Blob URL */
  async getFullMediaUrl(attachment) {
    const blob = await Store.getBlob(attachment.mediaId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  },

  /* ---- 内部工具方法 ---- */

  _loadImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  },

  _canvasToBlob(img, w, h, type, quality) {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob), type, quality);
    });
  },

  _extractVideoFrame(file) {
    return new Promise(resolve => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;

      const url = URL.createObjectURL(file);
      video.src = url;

      video.onloadeddata = () => {
        video.currentTime = 0.5; // 取第 0.5 秒作为封面
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        const w = Math.min(video.videoWidth, this.THUMBNAIL_SIZE);
        const h = Math.round(video.videoHeight * (w / video.videoWidth));
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(video, 0, 0, w, h);
        canvas.toBlob(blob => {
          URL.revokeObjectURL(url);
          resolve(blob);
        }, 'image/jpeg', 0.7);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null); // 视频加载失败，缩略图为空
      };
    });
  },

  _getVideoMeta(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      const url = URL.createObjectURL(file);
      video.src = url;
      video.onloadedmetadata = () => {
        resolve({ videoWidth: video.videoWidth, videoHeight: video.videoHeight });
        URL.revokeObjectURL(url);
      };
      video.onerror = () => { URL.revokeObjectURL(url); reject(); };
    });
  }
};
