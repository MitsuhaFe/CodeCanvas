// 获取DOM元素
const sidebarMenuItems = document.querySelectorAll('.sidebar-menu li');
const sections = document.querySelectorAll('.section');
const wallpaperGrid = document.getElementById('wallpaper-grid');
const uploadWallpaperBtn = document.getElementById('upload-wallpaper-btn');
const contextMenu = document.getElementById('context-menu');

// 确保API_BASE_URL存在
if (typeof window.API_BASE_URL === 'undefined') {
  window.API_BASE_URL = 'http://localhost:8080';
}

// 全局变量
let currentWallpaperId = null;
let allWallpapers = []; // 存储所有壁纸数据
let visibleWallpapers = []; // 存储当前可见的壁纸
let isLoading = false; // 标记是否正在加载
let observer = null; // 滚动交叉观察器

// 配置参数
const PAGE_SIZE = 96; // 每页加载的壁纸数量
const BATCH_SIZE = 10; // 每批渲染的壁纸数量
let currentPage = 0; // 当前页码
let hasMore = true; // 是否还有更多壁纸可加载

// 防抖函数
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// 节流函数
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
  // 初始化交叉观察器
  initIntersectionObserver();
  
  // 加载壁纸
  loadWallpapers();
  
  // 设置事件监听器
  setupEventListeners();
  
  // 设置壁纸应用成功的通知
  setupWallpaperAppliedListener();
});

// 初始化交叉观察器
function initIntersectionObserver() {
  // 配置选项
  const options = {
    root: wallpaperGrid,
    rootMargin: '100px', // 提前100px加载
    threshold: 0.1 // 当元素10%可见时触发
  };
  
  // 创建观察器
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // 当元素进入视图时，可以添加动画效果或者其他处理
        entry.target.classList.add('in-viewport');
        
        // 懒加载图片
        const img = entry.target.querySelector('img');
        if (img && img.dataset.src && !img.src.includes(img.dataset.src)) {
          img.src = img.dataset.src;
        }
      } else {
        entry.target.classList.remove('in-viewport');
      }
    });
  }, options);
}

// 设置壁纸应用成功的通知
function setupWallpaperAppliedListener() {
  window.wallpaperAPI.onWallpaperApplied((wallpaperId) => {
    showNotification('壁纸应用成功！');
  });
}

// 显示通知
function showNotification(message) {
  // 检查是否已经存在通知，如果有则移除
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    document.body.removeChild(existingNotification);
  }
  
  // 创建新通知
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  // 3秒后移除通知
  setTimeout(() => {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 3000);
}

// 设置所有事件监听器
function setupEventListeners() {
  // 侧边栏导航
  sidebarMenuItems.forEach(item => {
    item.addEventListener('click', () => {
      // 移除所有active类
      sidebarMenuItems.forEach(i => i.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // 添加active类到当前项
      item.classList.add('active');
      const sectionId = item.getAttribute('data-section');
      document.getElementById(sectionId).classList.add('active');
    });
  });
  
  // 上传壁纸按钮
  uploadWallpaperBtn.addEventListener('click', handleWallpaperUpload);
  
  // 全局点击事件，用于隐藏上下文菜单
  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });
  
  // 上下文菜单项点击事件
  document.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', handleContextMenuAction);
  });
  
  // 窗口大小调整时重新计算网格 - 使用防抖
  window.addEventListener('resize', debounce(() => {
    adjustGridColumns();
  }, 200));
  
  // 滚动加载更多 - 使用节流
  wallpaperGrid.addEventListener('scroll', throttle((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // 当滚动到底部附近时加载更多
    if (scrollHeight - scrollTop - clientHeight < 300 && !isLoading) {
      loadMoreWallpapers();
    }
  }, 200));
}

// 初始化Intersection Observer
function initObserver() {
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !isLoading && hasMore) {
        loadMoreWallpapers();
      }
    });
  }, {
    root: null,
    rootMargin: '100px',
    threshold: 0.1
  });
}

// 加载壁纸
async function loadWallpapers() {
  try {
    isLoading = true;
    // 显示加载消息
    wallpaperGrid.innerHTML = '<div class="loading-message">加载壁纸中...</div>';
    
    // 重置分页状态
    currentPage = 0;
    hasMore = true;
    allWallpapers = [];
    visibleWallpapers = [];
    
    // 获取壁纸数据 - 第一页
    const { success, wallpapers, message, total, page, size } = await window.wallpaperAPI.getWallpapers(currentPage, PAGE_SIZE);
    
    if (!success) {
      wallpaperGrid.innerHTML = `<div class="loading-message">加载失败: ${message}</div>`;
      isLoading = false;
      return;
    }
    
    if (!wallpapers || wallpapers.length === 0) {
      wallpaperGrid.innerHTML = '<div class="loading-message">暂无壁纸，请上传新壁纸</div>';
      isLoading = false;
      return;
    }
    
    // 清空网格
    wallpaperGrid.innerHTML = '';
    
    // 存储所有壁纸
    allWallpapers = wallpapers;
    visibleWallpapers = wallpapers;
    
    // 记录服务器上的总数，用于分页加载
    window.serverTotalWallpapers = total || wallpapers.length;
    
    // 初始化显示第一页
    await batchRenderWallpapers(visibleWallpapers);
    
    // 调整网格列数
    adjustGridColumns();
    
    // 初始化观察器
    initObserver();
    
    // 观察最后一个壁纸项
    if (wallpaperGrid.lastElementChild) {
      observer.observe(wallpaperGrid.lastElementChild);
    }
    
    isLoading = false;
  } catch (error) {
    wallpaperGrid.innerHTML = `<div class="loading-message">加载失败: ${error.message}</div>`;
    isLoading = false;
  }
}

// 批量渲染壁纸
async function batchRenderWallpapers(wallpapers) {
  // 创建一个文档片段以提高性能
  const fragment = document.createDocumentFragment();
  
  // 按批次渲染
  for (let i = 0; i < wallpapers.length; i += BATCH_SIZE) {
    const batch = wallpapers.slice(i, i + BATCH_SIZE);
    
    // 添加当前批次的壁纸
    batch.forEach(wallpaper => {
      const wallpaperElement = createWallpaperElement(wallpaper);
      fragment.appendChild(wallpaperElement);
    });
    
    // 每批次后让出主线程一小段时间
    if (i + BATCH_SIZE < wallpapers.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  // 一次性添加所有元素到DOM
  wallpaperGrid.appendChild(fragment);
}

// 加载更多壁纸
async function loadMoreWallpapers() {
  if (isLoading || !hasMore) {
    return;
  }
  
  isLoading = true;
  
  try {
    // 计算下一页
    const nextPage = currentPage + 1;
    
    // 从服务器加载下一页
    const { success, wallpapers, message, total } = await window.wallpaperAPI.getWallpapers(nextPage, PAGE_SIZE);
    
    if (!success || !wallpapers || wallpapers.length === 0) {
      hasMore = false;
      isLoading = false;
      return;
    }
    
    // 更新页码
    currentPage = nextPage;
    
    // 将新加载的壁纸添加到本地列表中
    allWallpapers = [...allWallpapers, ...wallpapers];
    visibleWallpapers = [...visibleWallpapers, ...wallpapers];
    
    // 批量渲染新增的壁纸
    await batchRenderWallpapers(wallpapers);
    
    // 重新观察最后一个壁纸项
    if (wallpaperGrid.lastElementChild) {
      observer.observe(wallpaperGrid.lastElementChild);
    }
    
    // 检查是否还有更多壁纸
    hasMore = visibleWallpapers.length < total;
    
  } catch (error) {
    console.error('加载更多壁纸失败:', error);
  } finally {
    isLoading = false;
  }
}

// 创建壁纸元素
function createWallpaperElement(wallpaper) {
  const wallpaperItem = document.createElement('div');
  wallpaperItem.className = 'wallpaper-item';
  wallpaperItem.setAttribute('data-id', wallpaper.id);
  
  // 创建图片元素
  const img = document.createElement('img');
  
  // 确保URL是完整的
  const imageUrl = wallpaper.thumbnailUrl || wallpaper.url;
  const fullUrl = imageUrl.startsWith('http') || imageUrl.startsWith('file:') 
    ? imageUrl 
    : window.API_BASE_URL + imageUrl;
  
  // 设置懒加载属性
  img.dataset.src = fullUrl;
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
  img.alt = wallpaper.name;
  
  // 错误处理
  img.onerror = function() {
    console.error('加载缩略图失败:', wallpaper.id);
    // 如果加载失败，尝试使用服务器路径
    if (!fullUrl.includes(window.API_BASE_URL)) {
      this.src = `${window.API_BASE_URL}/api/wallpapers/files/${wallpaper.id}/thumbnail.jpg`;
    }
  };
  
  // 创建名称元素
  const nameElement = document.createElement('div');
  nameElement.className = 'wallpaper-name';
  nameElement.textContent = wallpaper.name;
  
  // 添加子元素
  wallpaperItem.appendChild(img);
  wallpaperItem.appendChild(nameElement);
  
  // 添加事件监听器
  // 双击应用壁纸
  wallpaperItem.ondblclick = function() {
    console.log('双击应用壁纸:', wallpaper.id);
    applyWallpaper(wallpaper.id);
  };
  
  // 单击时显示壁纸信息
  wallpaperItem.onclick = function(e) {
    // 防止双击事件触发时也触发单击事件处理
    if (e.detail === 1) {
      // 使用延迟确保不会与双击事件冲突
      setTimeout(() => {
        if (!e.detail || e.detail === 1) {
          console.log('查看壁纸信息:', wallpaper.name);
          // 在这里可以实现壁纸预览逻辑
        }
      }, 200);
    }
  };
  
  // 右键显示上下文菜单
  wallpaperItem.oncontextmenu = function(e) {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY, wallpaper.id);
    return false;
  };
  
  // 将元素添加到观察器
  observer.observe(wallpaperItem);
  
  return wallpaperItem;
}

// 调整网格列数
function adjustGridColumns() {
  // 根据容器宽度计算最佳列数
  const containerWidth = wallpaperGrid.clientWidth;
  const minItemWidth = 180; // 最小项宽度
  const gap = 20; // 间隙大小
  const optimalColumns = Math.floor((containerWidth + gap) / (minItemWidth + gap));
  const columns = Math.max(1, optimalColumns);
  
  // 更新CSS变量
  wallpaperGrid.style.setProperty('--grid-columns', columns);
}

// 上传壁纸
async function handleWallpaperUpload() {
  try {
    const { success, results, message } = await window.wallpaperAPI.uploadWallpaper();
    
    if (!success) {
      alert(`上传失败: ${message}`);
      return;
    }
    
    if (results && results.length > 0) {
      showNotification(`成功上传 ${results.length} 个壁纸，应用将刷新...`);
      
      // 延迟一小段时间后刷新应用，以便用户看到通知
      setTimeout(async () => {
        await window.wallpaperAPI.reloadApp();
      }, 1500);
    }
  } catch (error) {
    alert(`上传过程中发生错误: ${error.message}`);
  }
}

// 显示上下文菜单
function showContextMenu(x, y, wallpaperId) {
  // 隐藏之前的菜单
  hideContextMenu();
  
  // 设置当前壁纸ID
  currentWallpaperId = wallpaperId;
  
  // 清空旧的菜单项
  while (contextMenu.firstChild) {
    contextMenu.removeChild(contextMenu.firstChild);
  }
  
  // 创建标准菜单项
  const menuItems = [
    {
      text: '应用壁纸',
      action: () => {
        applyWallpaper(wallpaperId);
        hideContextMenu();
      }
    },
    {
      text: '删除壁纸',
      action: () => {
        deleteWallpaper(wallpaperId);
        hideContextMenu();
      }
    }
  ];
  
  // 查找对应的壁纸元素，判断是否为视频类型
  const wallpaperElement = document.querySelector(`[data-id="${wallpaperId}"]`);
  const isVideoWallpaper = wallpaperElement && wallpaperElement.dataset.type === 'video';
  
  // 如果是视频壁纸，添加相关控制选项
  if (isVideoWallpaper) {
    menuItems.push({ type: 'separator' });
    
    menuItems.push({
      text: '暂停动态壁纸',
      action: () => {
        togglePauseDynamicWallpaper(true);
        hideContextMenu();
      }
    });
    
    menuItems.push({
      text: '恢复动态壁纸',
      action: () => {
        togglePauseDynamicWallpaper(false);
        hideContextMenu();
      }
    });
    
    menuItems.push({
      text: '停止动态壁纸',
      action: () => {
        stopDynamicWallpaper();
        hideContextMenu();
      }
    });
  }
  
  // 渲染菜单项
  menuItems.forEach(item => {
    if (item.type === 'separator') {
      const separator = document.createElement('div');
      separator.className = 'menu-separator';
      contextMenu.appendChild(separator);
    } else {
      const menuItem = document.createElement('div');
      menuItem.className = 'context-menu-item';
      menuItem.textContent = item.text;
      menuItem.addEventListener('click', item.action);
      contextMenu.appendChild(menuItem);
    }
  });
  
  // 显示菜单前先定位
  contextMenu.style.display = 'block';
  
  // 获取菜单尺寸
  const menuWidth = contextMenu.offsetWidth;
  const menuHeight = contextMenu.offsetHeight;
  
  // 获取窗口尺寸
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  
  // 调整位置确保在窗口内
  if (x + menuWidth > windowWidth) {
    x = windowWidth - menuWidth - 5;
  }
  
  if (y + menuHeight > windowHeight) {
    y = windowHeight - menuHeight - 5;
  }
  
  // 应用位置
  contextMenu.style.left = `${x}px`;
  contextMenu.style.top = `${y}px`;
  
  console.log('显示上下文菜单，壁纸ID:', wallpaperId);
}

// 隐藏上下文菜单
function hideContextMenu() {
  contextMenu.style.display = 'none';
  currentWallpaperId = null;
}

// 处理上下文菜单动作
async function handleContextMenuAction(e) {
  if (!currentWallpaperId) return;
  
  const action = e.target.getAttribute('data-action');
  
  switch (action) {
    case 'apply':
      await applyWallpaper(currentWallpaperId);
      break;
    case 'delete':
      await deleteWallpaper(currentWallpaperId);
      break;
  }
  
  hideContextMenu();
}

// 应用壁纸
async function applyWallpaper(wallpaperId) {
  try {
    console.log('正在应用壁纸，ID:', wallpaperId);
    
    // 首先尝试停止可能正在运行的动态壁纸
    await window.wallpaperAPI.stopDynamicWallpaper();
    
    const { success, message } = await window.wallpaperAPI.setWallpaper(wallpaperId);
    
    if (!success) {
      alert(`应用壁纸失败: ${message}`);
    }
  } catch (error) {
    alert(`应用壁纸时发生错误: ${error.message}`);
  }
}

// 停止动态壁纸
async function stopDynamicWallpaper() {
  try {
    const { success, message } = await window.wallpaperAPI.stopDynamicWallpaper();
    console.log(`停止动态壁纸结果: ${message}`);
    return success;
  } catch (error) {
    console.error('停止动态壁纸时发生错误:', error);
    return false;
  }
}

// 暂停/恢复动态壁纸
async function togglePauseDynamicWallpaper(shouldPause = true) {
  try {
    const { success, message } = await window.wallpaperAPI.pauseDynamicWallpaper(shouldPause);
    console.log(`暂停/恢复动态壁纸结果: ${message}`);
    return success;
  } catch (error) {
    console.error('暂停/恢复动态壁纸时发生错误:', error);
    return false;
  }
}

// 删除壁纸
async function deleteWallpaper(wallpaperId) {
  try {
    // 移除确认提示框，直接删除
    const { success, message } = await window.wallpaperAPI.deleteWallpaper(wallpaperId);
    
    if (!success) {
      alert(`删除壁纸失败: ${message}`);
      return;
    }
    
    // 从数据中移除壁纸
    allWallpapers = allWallpapers.filter(wp => wp.id !== wallpaperId);
    visibleWallpapers = visibleWallpapers.filter(wp => wp.id !== wallpaperId);
    
    // 从UI中移除壁纸
    const wallpaperElement = document.querySelector(`.wallpaper-item[data-id="${wallpaperId}"]`);
    if (wallpaperElement) {
      wallpaperElement.remove();
    }
    
    // 如果可见壁纸数量减少，尝试加载更多
    if (visibleWallpapers.length < allWallpapers.length) {
      loadMoreWallpapers();
    }
    
    showNotification('壁纸已删除');
  } catch (error) {
    alert(`删除壁纸时发生错误: ${error.message}`);
  }
} 