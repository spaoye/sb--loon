/**
 * 作用：访问 linux.sb 时自动保存 Cookie
 */

const req = $request;
const url = req ? req.url : "";
const headers = (req && req.headers) ? req.headers : {};

console.log(`[linux.sb] 捕获到 URL: ${url}`);
console.log(`[linux.sb] 请求 Headers 包含键: ${Object.keys(headers).join(", ")}`);

// 忽略 cdn-cgi / svg / 图片等静态资源请求
if (url.includes("/cdn-cgi/") || url.endsWith(".svg") || url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".css") || url.endsWith(".js")) {
  console.log(`[linux.sb] 静态资源，跳过提取。`);
  $done({});
} else {
  // 查找 Cookie
  let cookie = "";
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === "cookie") {
      cookie = headers[key];
      break;
    }
  }

  if (cookie) {
    console.log(`[linux.sb] 成功提取到 Cookie: ${cookie.slice(0, 30)}...`);
    $persistentStore.write(cookie, "linuxsb_cookie");
    $notification.post("linux.sb", "Cookie 写入成功 🎉", "已成功保存/更新登录凭据！");
  } else {
    console.log(`[linux.sb] 该请求中未找到 Cookie 请求头。`);
    // 只有访问主页面未带 Cookie 时才提示
    if (url.includes("daily_checkin") || url.includes("/user/")) {
      $notification.post("linux.sb 提示", "未找到 Cookie", "如果已登录，请在网页内退出重新登录一次");
    }
  }

  $done({});
}
