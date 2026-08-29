/**
 * 作用：访问 linux.sb 时自动保存 Cookie
 */
const reqHeaders = $request.headers;
const cookie = reqHeaders['Cookie'] || reqHeaders['cookie'];

if (cookie) {
  const oldCookie = $persistentStore.read("linuxsb_cookie");
  if (oldCookie !== cookie) {
    if ($persistentStore.write(cookie, "linuxsb_cookie")) {
      $notification.post("linux.sb", "Cookie 写入成功", "已成功保存/更新登录 Cookie 🎉");
    } else {
      $notification.post("linux.sb", "Cookie 写入失败", "写入持久化存储时出错");
    }
  }
}

$done({});
