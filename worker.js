// office-preview-proxy.js
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request).catch(
      err => new Response(`代理服务错误: ${err.message}`, { status: 500 })
    ));
  });
  
  /**
   * 处理传入请求的主函数
   * @param {Request} request - 原始请求
   * @returns {Promise<Response>}
   */
  async function handleRequest(request) {
    const url = new URL(request.url);
    const proxyPrefix = '/proxy/';
    
    console.log('收到请求:', url.toString());
    
    // 请求路径不包含代理前缀时，显示帮助信息
    if (!url.pathname.startsWith(proxyPrefix)) {
      console.log('请求未包含代理前缀，返回帮助信息');
      return new Response(
        `Office预览代理服务
  
  使用方法: 在URL后添加"/proxy/"前缀后跟要代理的URL
  示例: ${url.origin}${proxyPrefix}https://view.officeapps.live.com/op/view.aspx?src=example.com/file.docx
  
  提示: 
  - 此服务专为Office在线预览设计
  - 支持自动URL重写和资源代理
        `, 
        {
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          status: 200
        }
      );
    }
    
    // 提取目标URL
    let targetURL = url.pathname.slice(proxyPrefix.length);
    const queryString = url.search;
    
    // 确保目标URL以http(s)://开头
    if (!targetURL.startsWith('http')) {
      targetURL = 'https://' + targetURL;
    }
    
    // 添加原始查询参数
    if (queryString) {
      targetURL += queryString;
    }
    
    console.log('代理请求目标URL:', targetURL);
    
    // 提取目标主机，用于重写URL
    const targetHost = new URL(targetURL).host;
    console.log('目标主机:', targetHost);
    
    // 创建新的请求对象
    const proxyRequest = createProxyRequest(request, targetURL);
    
    // 获取响应
    console.log('发送代理请求...');
    const originalResponse = await fetch(proxyRequest);
    console.log('收到目标服务器响应:', originalResponse.status, originalResponse.statusText);
    
    // 处理响应
    return processResponse(originalResponse, url.origin + proxyPrefix, targetHost);
  }
  
  /**
   * 创建代理请求
   * @param {Request} originalRequest - 原始请求
   * @param {string} targetURL - 目标URL
   * @returns {Request} 新的请求对象
   */
  function createProxyRequest(originalRequest, targetURL) {
    // 复制原始请求头
    const headers = new Headers(originalRequest.headers);
    
    // 删除可能导致问题的头
    headers.delete('host');
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    headers.delete('x-forwarded-proto');
    headers.delete('x-real-ip');
    
    // 设置referer为目标URL的origin，模拟正常访问
    const targetOrigin = new URL(targetURL).origin;
    headers.set('referer', targetOrigin);
    
    // 返回新的请求
    return new Request(targetURL, {
      method: originalRequest.method,
      headers: headers,
      body: originalRequest.body,
      redirect: 'follow'
    });
  }
  
  /**
   * 处理响应
   * @param {Response} response - 原始响应
   * @param {string} proxyBase - 代理基础URL
   * @param {string} targetHost - 目标主机
   * @returns {Promise<Response>} 处理后的响应
   */
  async function processResponse(response, proxyBase, targetHost) {
    // 获取内容类型
    const contentType = response.headers.get('content-type') || '';
    
    // 创建新的响应头
    const headers = new Headers(response.headers);
    
    // 添加CORS头
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', '*');
    
    // 设置缓存策略
    headers.set('Cache-Control', 'public, max-age=1800'); // 30分钟缓存
    
    // 根据不同内容类型处理
    if (contentType.includes('text/html')) {
      return processHtmlResponse(response, headers, proxyBase, targetHost);
    } else if (
      contentType.includes('text/css') ||
      contentType.includes('application/javascript') ||
      contentType.includes('text/javascript')
    ) {
      return processTextResponse(response, headers, proxyBase, targetHost);
    } else {
      // 其他类型资源直接返回
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
      });
    }
  }
  
  /**
   * 处理HTML响应
   * @param {Response} response - 原始响应
   * @param {Headers} headers - 响应头
   * @param {string} proxyBase - 代理基础URL
   * @param {string} targetHost - 目标主机
   * @returns {Promise<Response>} 处理后的响应
   */
  async function processHtmlResponse(response, headers, proxyBase, targetHost) {
    // 读取HTML内容
    let html = await response.text();
    
    // 注入base标签和资源拦截脚本
    const injectScript = `
      <base href="https://${targetHost}/">
      <script>
        // 资源加载错误处理
        window.addEventListener('error', function(e) {
          // 只处理资源加载错误
          if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK' || e.target.tagName === 'IMG')) {
            let origSrc = e.target.src || e.target.href;
            if (origSrc && (origSrc.startsWith('https://${targetHost}') || origSrc.startsWith('//'))) {
              // 确保URL是绝对路径
              if (origSrc.startsWith('//')) {
                origSrc = 'https:' + origSrc;
              }
              // 通过代理加载资源
              const newSrc = '${proxyBase}' + origSrc;
              console.log('[Office代理] 重试加载资源:', newSrc);
              
              // 重新设置资源URL
              if (e.target.tagName === 'SCRIPT') {
                const newScript = document.createElement('script');
                newScript.src = newSrc;
                e.target.parentNode.replaceChild(newScript, e.target);
              } else if (e.target.tagName === 'LINK') {
                e.target.href = newSrc;
              } else if (e.target.tagName === 'IMG') {
                e.target.src = newSrc;
              }
            }
          }
        }, true);
        
        // 重写document.write
        const originalWrite = document.write;
        document.write = function(content) {
          // 替换内容中的URL
          const modifiedContent = content.replace(/(src|href)=(['"])(https?:)?\/\/${targetHost}\//g, 
            function(match, attr, quote) {
              return attr + '=' + quote + '${proxyBase}https://${targetHost}/';
            }
          );
          return originalWrite.call(document, modifiedContent);
        };
        
        // 重写XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
          if (url && typeof url === 'string') {
            // 处理相对URL和绝对URL
            let absoluteUrl = url;
            if (url.startsWith('/')) {
              absoluteUrl = 'https://${targetHost}' + url;
            } else if (url.startsWith('https://${targetHost}')) {
              absoluteUrl = url;
            }
            
            // 如果是目标主机的URL，通过代理请求
            if (absoluteUrl.includes('${targetHost}')) {
              url = '${proxyBase}' + absoluteUrl;
              console.log('[Office代理] XHR请求重写:', url);
            }
          }
          originalXHROpen.call(this, method, url, async, user, password);
        };
        
        // 重写fetch
        const originalFetch = window.fetch;
        window.fetch = function(resource, init) {
          if (resource && typeof resource === 'string') {
            // 处理相对URL和绝对URL
            let absoluteUrl = resource;
            if (resource.startsWith('/')) {
              absoluteUrl = 'https://${targetHost}' + resource;
            } else if (resource.startsWith('https://${targetHost}')) {
              absoluteUrl = resource;
            }
            
            // 如果是目标主机的URL，通过代理请求
            if (absoluteUrl.includes('${targetHost}')) {
              resource = '${proxyBase}' + absoluteUrl;
              console.log('[Office代理] Fetch请求重写:', resource);
            }
          }
          return originalFetch.call(this, resource, init);
        };
        
        console.log('[Office代理] 已启用Office预览代理服务');
      </script>
    `;
    
    // 添加注入脚本到<head>
    html = html.replace('</head>', injectScript + '</head>');
    
    // 替换HTML中的URL
    html = html.replace(
      new RegExp(`(src|href)=(['"])(https?:)?//${targetHost}/`, 'g'),
      (match, attr, quote) => `${attr}=${quote}${proxyBase}https://${targetHost}/`
    );
    
    // 设置响应类型
    headers.set('content-type', 'text/html; charset=utf-8');
    
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }
  
  /**
   * 处理CSS/JS响应
   * @param {Response} response - 原始响应
   * @param {Headers} headers - 响应头
   * @param {string} proxyBase - 代理基础URL
   * @param {string} targetHost - 目标主机
   * @returns {Promise<Response>} 处理后的响应
   */
  async function processTextResponse(response, headers, proxyBase, targetHost) {
    // 读取内容
    let content = await response.text();
    
    // 替换URL引用
    content = content.replace(
      new RegExp(`(["'])(https?:)?//${targetHost}/`, 'g'),
      (match, quote) => `${quote}${proxyBase}https://${targetHost}/`
    );
    
    // 替换绝对路径引用
    content = content.replace(
      new RegExp(`(["'])(/[^"']*?)(['"])`, 'g'),
      (match, openQuote, path, closeQuote) => 
        `${openQuote}${proxyBase}https://${targetHost}${path}${closeQuote}`
    );
    
    return new Response(content, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  }