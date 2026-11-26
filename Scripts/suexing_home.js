/**
 * 苏e行首页净化脚本（兼容 Quantumult X 与 Loon）
 * 匹配 URL：^https?:\/\/api\.bwton\.com\/bas\/appmgt\/v3\/app-menus
 */
const body = typeof $response !== "undefined" && $response && $response.body ? $response.body : "";

if (!body) {
  $done({});
} else {
  try {
    const obj = JSON.parse(body);

    if (!obj || !obj.result || !Array.isArray(obj.result.menu_groups)) {
      $done({});
    } else if (obj.result.page_code === "BWTHomePage") {
      // 仅对首页 BWTHomePage 进行模块化剔除，避免影响乘车码与我的页面
      // 5   - Banner 广告位 (MSX_BN_000204)
      // 126 - 公告信息栏 (暂无公告信息)
      // 94  - 热门推荐区块 (热门推荐 / 更多推荐> 及 180 高度占位)
      // 59  - 信息流/品牌广告位 (MSX_BN_00117)
      // 73  - 瓷片卡片区 (地铁文创等空壳卡片)
      // 93  - 营销/推荐流楼层
      // 37  - 生活频道分类 Tab (推荐 / 好物 / 生活 / 周边游 / 娱乐 / 助农)
      // 129 - 融创悬浮球广告 (HOME_RCAD_FLOAT)
      const removeStyleCodes = new Set(["5", "126", "94", "59", "73", "93", "37", "129"]);
      const removeUtilityCodes = new Set([
        "MSX_HOME_FLOAT_DRAG",
        "HOME_RCAD_FLOAT",
        "HOME_STATION_RC_CP_AD_IN",
        "HOME_STATION_RC_CP_AD_OUT"
      ]);

      const beforeCount = obj.result.menu_groups.length;
      obj.result.menu_groups = obj.result.menu_groups
        .filter((group) => {
          if (!group) return false;
          if (removeStyleCodes.has(String(group.style_code))) return false;
          if (group.biz_type === 2 || group.adspace_code) return false;
          if (group.group_code === "TAB_STYLE_3") return false;
          if (group.group_name === "热门推荐" || group.group_name === "生活频道") return false;

          const items = Array.isArray(group.menu_items) ? group.menu_items : [];
          if (items.length > 0 && items.every((item) => item && removeUtilityCodes.has(item.utility_code))) {
            return false;
          }
          return true;
        })
        .map((group) => {
          if (Array.isArray(group.menu_items) && group.menu_items.length > 0) {
            group.menu_items = group.menu_items.filter(
              (item) => item && !removeUtilityCodes.has(item.utility_code)
            );
          }
          return group;
        });

      const headers = Object.assign({}, $response.headers || {});
      for (const key of Object.keys(headers)) {
        const lower = key.toLowerCase();
        if (lower === "signature" || lower === "content-length") {
          delete headers[key];
        }
      }

      console.log(`[苏e行] BWTHomePage 过滤完成: ${beforeCount} -> ${obj.result.menu_groups.length}`);
      $done({
        status: $response.status || 200,
        headers,
        body: JSON.stringify(obj)
      });
    } else {
      $done({});
    }
  } catch (e) {
    console.log("[苏e行] 首页净化脚本异常: " + e);
    $done({});
  }
}
