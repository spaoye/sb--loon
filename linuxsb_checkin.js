/**
 * linux.sb 定时签到（v4）
 *
 * 与 linuxsb_cookie.js 配合：
 * - 读取本地 Cookie 执行签到
 * - 一旦判定 Cookie 失效，写入 need_refresh=1
 *   下次访问签到页时，抓取脚本才会重新抓取（否则一律不抓）
 */

const K_COOKIE = "linuxsb_cookie";
const K_REFRESH = "linuxsb_need_refresh";
const K_DONE = "linuxsb_last_sign_date";

const URL = "https://linux.sb/daily_checkin";
const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.2 Mobile/15E148 Safari/604.1";

function log(msg) {
  console.log("[linux.sb 签到] " + msg);
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// 标记 Cookie 失效：下次打开签到页会自动重新抓取
function markInvalid(msg) {
  $persistentStore.write("1", K_REFRESH);
  log("已标记 Cookie 需刷新：" + msg);
  $notification.post(
    "linux.sb 签到失败",
    "登录已失效",
    msg + " 请用 Safari 打开签到页，会自动重新抓取 Cookie"
  );
}

const cookie = $persistentStore.read(K_COOKIE) || "";

if (!cookie || !/bbs_auth=/i.test(cookie)) {
  $persistentStore.write("1", K_REFRESH);
  log("本地无有效 Cookie");
  $notification.post(
    "linux.sb 签到",
    "缺少 Cookie",
    "请用 Safari 登录后打开 https://linux.sb/daily_checkin"
  );
  $done();
} else if ($persistentStore.read(K_DONE) === today()) {
  log("今日已签到（本地记录），跳过");
  $done();
} else {
  run();
}

function run() {
  const headers = {
    "User-Agent": UA,
    "Cookie": cookie,
    "Referer": URL,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh-Hans;q=0.9"
  };

  log("请求签到页…");

  $httpClient.get({ url: URL, headers }, (err, resp, data) => {
    if (err) {
      log("GET 失败：" + err);
      $notification.post("linux.sb 签到", "网络错误", String(err));
      return $done();
    }

    const status = resp ? resp.status : 0;
    const html = data || "";
    log("GET 状态 " + status + "，长度 " + html.length);

    // 登录态失效
    if (status === 302 || status === 401 || status === 403) {
      markInvalid("HTTP " + status + "。");
      return $done();
    }
    if (/请先登录|name=["']password["']/i.test(html)) {
      markInvalid("页面要求登录。");
      return $done();
    }

    if (status !== 200) {
      log("异常状态码");
      $notification.post("linux.sb 签到", "请求异常", "HTTP " + status + "，稍后自动重试");
      return $done();
    }

    // 已签到
    if (/今天已签到|今日已签到|已连续签到/.test(html)) {
      $persistentStore.write(today(), K_DONE);
      log("今日已签到");
      $notification.post("linux.sb 签到", "已完成", "今日已经签到过了");
      return $done();
    }

    const m = html.match(/<input\b[^>]*name=["']_csrf["'][^>]*value=["']([^"']+)["']/i);
    if (!m) {
      log("未匹配到 _csrf，页面片段：" + html.slice(0, 400));
      $notification.post("linux.sb 签到", "解析失败", "未提取到 _csrf 令牌");
      return $done();
    }

    log("提取到 _csrf");

    $httpClient.post({
      url: URL,
      headers: Object.assign({}, headers, {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://linux.sb"
      }),
      body: "_csrf=" + encodeURIComponent(m[1])
    }, (pErr, pResp, pData) => {
      if (pErr) {
        log("POST 失败：" + pErr);
        $notification.post("linux.sb 签到", "提交失败", String(pErr));
        return $done();
      }

      const pStatus = pResp ? pResp.status : 0;
      const pHtml = pData || "";
      log("POST 状态 " + pStatus);

      if (pStatus === 302 || /请先登录|name=["']password["']/i.test(pHtml)) {
        markInvalid("提交后被要求登录。");
        return $done();
      }

      const ok = pStatus >= 200 && pStatus < 400 &&
        (/签到成功|今日已签到|今天已签到|已连续签到/.test(pHtml) ||
         !/name=["']_csrf["']/i.test(pHtml));

      if (ok) {
        $persistentStore.write(today(), K_DONE);
        log("签到成功");
        $notification.post("linux.sb 签到", "成功 🎉", "今日签到完成");
      } else {
        log("状态未知，响应片段：" + pHtml.slice(0, 400));
        $notification.post("linux.sb 签到", "状态未知", "HTTP " + pStatus + "，稍后自动重试");
      }
      $done();
    });
  });
}
