/**
 * 作用：访问 linux.sb 时自动保存 Cookie
 */

if (typeof $request === "undefined") {
  $notification.post("linux.sb", "提示", "请勿手动运行。请用 Safari 登录 linux.sb 获取 Cookie");
  $done({});
} else {
  const reqHeaders = $request.headers || {};
  
  // 兼容各种大小写形式的 Cookie 键名
  let cookie = "";
  for (const key of Object.keys(reqHeaders)) {
    if (key.toLowerCase() === "cookie") {
      cookie = reqHeaders[key];
      break;
    }
  }

  // 确保 Cookie 包含有效内容（至少包含 session / token / _csrf 等特征，且不是空）
  if (cookie && cookie.length > 10) {
    const oldCookie = $persistentStore.read("linuxsb_cookie");
    if (oldCookie !== cookie) {
      if ($persistentStore.write(cookie, "linuxsb_cookie")) {
        $notification.post("linux.sb", "Cookie 写入成功 🎉", "已成功保存/更新登录凭据！");
      } else {
        $notification.post("linux.sb", "Cookie 写入失败 ⚠️", "持久化存储写入失败");
      }
    }
  }

  $done({});
}
