// 渲染壁纸项
const renderWallpaperItem = (wallpaper) => {
  return (
    <div 
      key={wallpaper.id} 
      className="wallpaper-item"
      ref={(el) => wallpaperRefs.current[wallpaper.id] = el}
      onClick={() => handleWallpaperClick(wallpaper)}
    >
      <div className="wallpaper-thumbnail">
        {wallpaper.thumbnailUrl ? (
          <img 
            src={wallpaper.thumbnailUrl} 
            alt={wallpaper.name || '壁纸'} 
            loading="lazy"
            onLoad={() => markImageLoaded(wallpaper.id)}
            onError={(e) => {
              console.error('加载缩略图失败:', wallpaper.id);
              // 如果本地缓存的缩略图加载失败，尝试使用服务器URL
              if (!e.target.src.includes(API_BASE_URL)) {
                e.target.src = `${API_BASE_URL}/api/wallpapers/files/${wallpaper.id}/thumbnail.jpg`;
              }
            }}
          />
        ) : (
          // 使用新的路径格式获取缩略图
          <img 
            src={`${API_BASE_URL}/api/wallpapers/files/${wallpaper.id}/thumbnail.jpg`}
            alt={wallpaper.name || '壁纸'} 
            loading="lazy"
            onLoad={() => markImageLoaded(wallpaper.id)}
            onError={() => console.error('加载缩略图失败:', wallpaper.id)}
          />
        )}
        <div className="wallpaper-overlay">
          <button 
            className="set-wallpaper-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleSetWallpaper(wallpaper);
            }}
          >
            设为壁纸
          </button>
        </div>
      </div>
      <div className="wallpaper-info">
        <span className="wallpaper-name">{wallpaper.name || `壁纸 ${wallpaper.id}`}</span>
      </div>
    </div>
  );
};

// 处理大图预览
const handleWallpaperClick = (wallpaper) => {
  setSelectedWallpaper({
    ...wallpaper,
    // 使用新的路径格式获取原图
    fullImageUrl: `${API_BASE_URL}/api/wallpapers/files/${wallpaper.id}/${wallpaper.fileName || 'original.jpg'}`
  });
  setPreviewOpen(true);
}; 