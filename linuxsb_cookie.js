/**
 * linux.sb Cookie 抓取（v4）
 *
 * 设计要点：
 * 1. 只在签到页 /daily_checkin 的请求里抓取，其他页面一律忽略
 * 2. 已有可用 Cookie 时不重复写入（避免刷屏通知和无意义 IO）
 * 3. 只有以下三种情况才写入：
 *    a. 本地还没有 Cookie
 *    b. 签到脚本标记了 need_refresh（说明上次签到时判定失效）
 *    c. 抓到的 bbs_auth 与本地不同（说明用户重新登录，凭据已更新）
 * 4. 必须包含 bbs_auth 才认为是有效登录凭据
 */

const K_COOKIE = "linuxsb_cookie";
const K_REFRESH = "linuxsb_need_refresh";
const K_UPDATED = "linuxsb_cookie_updated_at";

function log(msg) {
  console.log("[linux.sb ck] " + msg);
}

// 从 Cookie 字符串里取出 bbs_auth 的值，作为凭据指纹
function authOf(cookieStr) {
  if (!cookieStr) return "";
  const m = String(cookieStr).match(/bbs_auth=([^;\s]+)/i);
  return m ? m[1] : "";
}

function nowStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

if (typeof $request === "undefined") {
  log("非请求环境，跳过（请勿手动运行）");
  $done({});
} else {
  const url = $request.url || "";

  // —— 门禁 1：只处理签到页
  if (!/\/daily_checkin(\/|\?|$)/i.test(url)) {
    log("非签到页，忽略：" + url);
    $done({});
  } else {
    const headers = $request.headers || {};
    let cookie = "";
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === "cookie") {
        cookie = headers[k];
        break;
      }
    }

    const newAuth = authOf(cookie);

    // —— 门禁 2：必须是带登录凭据的请求
    if (!newAuth) {
      log("签到页请求中无 bbs_auth，可能未登录，忽略");
      $done({});
    } else {
      const stored = $persistentStore.read(K_COOKIE) || "";
      const storedAuth = authOf(stored);
      const needRefresh = $persistentStore.read(K_REFRESH) === "1";

      let reason = "";
      if (!stored) {
        reason = "首次获取";
      } else if (needRefresh) {
        reason = "签到脚本报告失效，强制刷新";
      } else if (newAuth !== storedAuth) {
        reason = "检测到新的登录凭据";
      }

      if (!reason) {
        // —— 已有可用 Cookie，静默跳过
        log("本地 Cookie 仍标记为可用，跳过抓取");
        $done({});
      } else {
        $persistentStore.write(cookie, K_COOKIE);
        $persistentStore.write("0", K_REFRESH);
        $persistentStore.write(nowStr(), K_UPDATED);
        log("已写入 Cookie（" + reason + "），长度 " + cookie.length);
        $notification.post(
          "linux.sb Cookie 已更新 🎉",
          reason,
          "长度 " + cookie.length + " 字节 · " + nowStr()
        );
        $done({});
      }
    }
  }
}
