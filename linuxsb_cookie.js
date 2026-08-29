/**
 * 作用：访问 linux.sb 时自动保存 Cookie
 */

if (typeof $request === "undefined") {
  // 防止手动点击运行时报错
  $notification.post("linux.sb", "提示", "请勿手动运行此脚本。请打开 Safari 访问并登录 https://linux.sb 获取 Cookie");
  $done({});
} else {
  const reqHeaders = $request.headers || {};
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
}
