/**
 * 作用：每日定时签到
 */
const cookie = $persistentStore.read("linuxsb_cookie");

if (!cookie) {
  $notification.post("linux.sb 签到", "跳过", "未检测到 Cookie，请先在浏览器登录 linux.sb 并刷新页面");
  $done();
} else {
  runCheckin();
}

function runCheckin() {
  const url = "https://linux.sb/daily_checkin";
  const headers = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Cookie": cookie,
    "Referer": "https://linux.sb/daily_checkin"
  };

  // 1. 获取签到页面状态及 _csrf
  $httpClient.get({ url, headers }, (err, resp, data) => {
    if (err) {
      $notification.post("linux.sb 签到", "请求失败", `网络错误: ${err}`);
      return $done();
    }

    if (resp.status === 302 || resp.status === 401 || (data && (data.includes("/login") || data.includes("请先登录")))) {
      $notification.post("linux.sb 签到", "Cookie 失效", "登录态已过期，请重新登录获取");
      return $done();
    }

    if (data && (data.includes("今天已签到") || data.includes("今日已签到") || data.includes("已连续签到"))) {
      $notification.post("linux.sb 签到", "已完成", "今日已经签到过了");
      return $done();
    }

    // 匹配表单中的 _csrf
    const csrfMatch = data && data.match(/<input\b[^>]*name=["']_csrf["'][^>]*value=["']([^"']+)["']/i);
    if (!csrfMatch || !csrfMatch[1]) {
      $notification.post("linux.sb 签到", "失败", "未能提取到 _csrf 令牌");
      return $done();
    }

    const csrf = csrfMatch[1];

    // 2. 提交签到请求
    $httpClient.post({
      url,
      headers: {
        ...headers,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: `_csrf=${encodeURIComponent(csrf)}`
    }, (postErr, postResp, postData) => {
      if (postErr) {
        $notification.post("linux.sb 签到", "提交失败", `网络错误: ${postErr}`);
      } else if (postResp.status >= 200 && postResp.status < 400 && (postData.includes("签到成功") || postData.includes("已签到") || !postData.includes("name=\"_csrf\""))) {
        $notification.post("linux.sb 签到", "成功", "今日签到成功 🎉");
      } else {
        $notification.post("linux.sb 签到", "状态未知", `HTTP 状态码: ${postResp.status}`);
      }
      $done();
    });
  });
}
