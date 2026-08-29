/**
 * 作用：访问 linux.sb 时自动保存 Cookie（增强版+调试通知）
 */

const isRequest = typeof $response === "undefined";
const headers = (isRequest ? $request.headers : $response.headers) || {};

// 查找 Cookie 或 Set-Cookie
let cookieVal = "";
for (const key of Object.keys(headers)) {
  const lower = key.toLowerCase();
  if (lower === "cookie" || lower === "set-cookie") {
    cookieVal = headers[key];
    break;
  }
}

if (cookieVal) {
  const oldCookie = $persistentStore.read("linuxsb_cookie");
  $persistentStore.write(cookieVal, "linuxsb_cookie");
  $notification.post("linux.sb", "Cookie 写入成功 🎉", `成功抓取到凭据 (${cookieVal.slice(0, 20)}...)`);
} else {
  // 如果拦截到了 /user/ 或 /daily_checkin 却没 Cookie，弹出排查提示
  const url = isRequest ? ($request.url || "") : "";
  if (url.includes("/user/") || url.includes("daily_checkin")) {
    $notification.post("linux.sb 调试", "未找到 Cookie 头", `当前请求 Header 键名: ${Object.keys(headers).join(", ")}`);
  }
}

$done(isRequest ? {} : {});
