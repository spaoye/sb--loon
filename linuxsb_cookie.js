/**
 * 作用：访问 linux.sb 时自动保存 Cookie
 * 版本：v3 (修复 cdn-cgi 误判)
 */

const req = typeof $request !== "undefined" ? $request : null;

if (!req) {
  console.log("[linux.sb] 手动运行不支持");
  $notification.post("linux.sb", "提示", "请用 Safari 登录 linux.sb 触发");
  $done({});
} else {
  const url = req.url || "";
  const headers = req.headers || {};
  const keys = Object.keys(headers);

  console.log("[linux.sb] URL: " + url);
  console.log("[linux.sb] Header 键名: " + keys.join(", "));

  // 只跳过真正的静态文件（图片、样式、字体等）
  const isStatic = /\.(svg|png|jpg|jpeg|gif|css|js|woff2?|ico)(\?|$)/i.test(url);

  if (isStatic) {
    console.log("[linux.sb] 静态资源，跳过");
    $done({});
  } else {
    let cookie = "";
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === "cookie") {
        cookie = headers[keys[i]];
        break;
      }
    }

    if (cookie && cookie.length > 10) {
      console.log("[linux.sb] ✅ 提取到 Cookie 长度: " + cookie.length);
      $persistentStore.write(cookie, "linuxsb_cookie");
      $notification.post("linux.sb", "Cookie 写入成功 🎉", "长度 " + cookie.length + " 字节");
    } else {
      console.log("[linux.sb] ❌ 未找到 Cookie");
      $notification.post("linux.sb 诊断", "无 Cookie", "Keys: " + keys.join(", "));
    }

    $done({});
  }
}
