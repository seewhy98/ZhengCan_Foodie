let data;
let current = [];
let selectedId = "";
const localStorageKey = "zhengcan.localRestaurants";

const state = {
  view: "library",
  search: "",
  category: "",
  district: "",
  price: "",
  scene: "",
};

const districtPositions = {
  海淀区: [30, 32],
  朝阳区: [66, 40],
  西城区: [43, 50],
  东城区: [52, 48],
  丰台区: [43, 70],
  昌平区: [40, 17],
  石景山区: [24, 56],
  大兴区: [50, 84],
  通州区: [82, 58],
  怀柔区: [70, 16],
};

const provincePositions = {
  新疆: [12, 27], 西藏: [18, 56], 青海: [31, 48], 甘肃: [39, 38], 宁夏: [47, 37],
  内蒙古: [50, 23], 黑龙江: [76, 14], 吉林: [76, 24], 辽宁: [72, 32], 北京: [62, 34],
  天津: [65, 38], 河北: [60, 40], 山西: [54, 42], 陕西: [49, 49], 四川: [42, 61],
  重庆: [50, 63], 贵州: [50, 72], 云南: [40, 78], 广西: [57, 82], 广东: [65, 83],
  海南: [62, 94], 河南: [58, 51], 山东: [67, 47], 江苏: [72, 57], 安徽: [66, 59],
  湖北: [58, 61], 湖南: [58, 72], 江西: [66, 70], 浙江: [75, 68], 福建: [72, 78],
  上海: [79, 60], 台湾: [82, 84],
};

const els = {};

function $(id) {
  return document.getElementById(id);
}

function yuan(price) {
  return price ? `人均 ${Math.round(price)} 元` : "人均未知";
}

function statusLabel(status) {
  return {
    active: "营业/未标异常",
    closed: "疑似关门",
    suspended: "暂停营业",
    avoided: "没敢吃",
  }[status] || status || "营业/未标异常";
}

function safe(text) {
  return String(text || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  }[char]));
}

function initElements() {
  [
    "stats",
    "searchInput",
    "categoryFilter",
    "districtFilter",
    "priceFilter",
    "sceneFilter",
    "restaurantList",
    "detailPanel",
    "partnerSelect",
    "purposeSelect",
    "budgetSelect",
    "recommendButton",
    "recommendations",
    "tasteMap",
    "mapSide",
    "closedList",
    "viewTitle",
    "libraryBadge",
    "closedBadge",
    "placesList",
    "chinaMap",
    "nationalSide",
    "addRestaurantForm",
    "newName",
    "newCategory",
    "newDistrict",
    "newStation",
    "newAddress",
    "newFeature",
    "newPrice",
    "newComfort",
    "newIntimacy",
    "newLng",
    "newLat",
    "newNote",
    "newStarred",
  ].forEach((id) => {
    els[id] = $(id);
  });
}

function initStats() {
  const stats = data.stats;
  els.stats.innerHTML = "";
  els.libraryBadge.textContent = `${stats.beijingCount}条记忆`;
  els.closedBadge.textContent = `${stats.closedCount}条回忆`;
}

function getLocalRestaurants() {
  try {
    return JSON.parse(localStorage.getItem(localStorageKey) || "[]");
  } catch {
    return [];
  }
}

function saveLocalRestaurants(items) {
  localStorage.setItem(localStorageKey, JSON.stringify(items));
}

function mergeLocalRestaurants() {
  const local = getLocalRestaurants();
  data.beijing = [...local, ...data.beijing];
  data.stats.beijingCount = data.beijing.length;
}

function fillSelect(select, items, defaultLabel) {
  select.innerHTML = `<option value="">${defaultLabel}</option>` +
    items.map((item) => `<option value="${safe(item)}">${safe(item)}</option>`).join("");
}

function initFilters() {
  const categories = [...new Set(data.beijing.map((item) => item.category))];
  const districts = [...new Set(data.beijing.map((item) => item.district).filter(Boolean))].sort();
  const scenes = [...new Set(data.beijing.flatMap((item) => item.scenes || []))].sort();

  fillSelect(els.categoryFilter, categories, "全部");
  fillSelect(els.districtFilter, districts, "全部");
  fillSelect(els.sceneFilter, scenes, "全部");
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  els.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderLibrary();
  });
  els.categoryFilter.addEventListener("change", (event) => {
    state.category = event.target.value;
    renderLibrary();
  });
  els.districtFilter.addEventListener("change", (event) => {
    state.district = event.target.value;
    renderLibrary();
  });
  els.priceFilter.addEventListener("change", (event) => {
    state.price = event.target.value;
    renderLibrary();
  });
  els.sceneFilter.addEventListener("change", (event) => {
    state.scene = event.target.value;
    renderLibrary();
  });
  els.recommendButton.addEventListener("click", renderRecommendations);
  els.addRestaurantForm.addEventListener("submit", saveNewRestaurant);
}

function setView(view) {
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  $(`${view}View`).classList.add("active");
  const titles = {
    library: "餐厅库",
    add: "新增餐厅",
    planner: "今晚和谁吃",
    map: "北京食客图鉴",
    places: "北京好地Test",
    closed: "关门纪念馆",
    national: "全国巡店ComingSoon",
  };
  els.viewTitle.textContent = titles[view];
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && value !== "" ? parsed : null;
}

function scoreValue(score) {
  return {
    S: 100,
    "A+": 95,
    A: 90,
    "A-": 85,
    "B+": 80,
    B: 75,
    "B-": 70,
    "C+": 65,
    C: 60,
    D: 40,
  }[score] || 0;
}

function makeTags(feature) {
  return String(feature || "").split(/[，,、/]/).map((tag) => tag.trim()).filter(Boolean);
}

function inferScenesClient(item) {
  const scenes = new Set();
  const tags = (item.tags || []).join("");
  if ((item.comfortScore || 0) >= 85) scenes.add("安静聊天");
  if ((item.comfortScore || 0) >= 80 && item.price && item.price >= 180) scenes.add("仪式感");
  if ((item.intimacyScore || 0) >= 85) scenes.add("熟人亲密局");
  if (["B", "B+", "B-"].includes(item.intimacy)) scenes.add("朋友小聚");
  if (["C", "D"].includes(item.intimacy) || item.category !== "正餐") scenes.add("轻松随便");
  if (item.price && item.price <= 60) scenes.add("一个人吃");
  if (item.category === "酒吧咖啡") scenes.add("饭后续摊");
  if (["火锅", "烤肉", "烤串", "涮羊肉"].some((word) => tags.includes(word))) scenes.add("热闹分享");
  if (item.starred) scenes.add("值得专门去");
  return [...scenes].sort();
}

function saveNewRestaurant(event) {
  event.preventDefault();
  const district = normalizeDistrictClient(els.newDistrict.value.trim());
  const station = els.newStation.value.trim();
  const feature = els.newFeature.value.trim();
  const item = {
    id: `local-${Date.now()}`,
    sourceSheet: "本地新增",
    category: els.newCategory.value,
    name: els.newName.value.trim(),
    starred: els.newStarred.checked,
    date: new Date().toISOString().slice(0, 10),
    city: "北京",
    district,
    station,
    area: station ? `${district}，${station}` : district,
    address: els.newAddress.value.trim(),
    feature,
    tags: makeTags(feature),
    price: numberOrNull(els.newPrice.value),
    intimacy: els.newIntimacy.value,
    comfort: els.newComfort.value,
    note: els.newNote.value.trim(),
    listed: "",
    status: "active",
    lng: numberOrNull(els.newLng.value),
    lat: numberOrNull(els.newLat.value),
  };
  item.comfortScore = scoreValue(item.comfort);
  item.intimacyScore = scoreValue(item.intimacy);
  item.scenes = inferScenesClient(item);

  const local = getLocalRestaurants();
  local.unshift(item);
  saveLocalRestaurants(local);
  data.beijing.unshift(item);
  data.stats.beijingCount = data.beijing.length;
  selectedId = item.id;
  initStats();
  initFilters();
  renderLibrary();
  renderRecommendations();
  renderMap();
  renderNationalMap();
  els.addRestaurantForm.reset();
  setView("library");
}

function normalizeDistrictClient(value) {
  const raw = String(value || "").replace(/区$/, "");
  const map = {
    东城: "东城区", 西城: "西城区", 朝阳: "朝阳区", 海淀: "海淀区", 丰台: "丰台区",
    石景山: "石景山区", 门头沟: "门头沟区", 房山: "房山区", 通州: "通州区",
    顺义: "顺义区", 昌平: "昌平区", 大兴: "大兴区", 怀柔: "怀柔区",
    平谷: "平谷区", 密云: "密云区", 延庆: "延庆区",
  };
  return map[raw] || value;
}

function filteredRestaurants() {
  const query = state.search.toLowerCase();
  return data.beijing.filter((item) => {
    const haystack = [
      item.name,
      item.feature,
      item.area,
      item.address,
      item.note,
      ...(item.tags || []),
      ...(item.scenes || []),
    ].join(" ").toLowerCase();

    if (query && !haystack.includes(query)) return false;
    if (state.category && item.category !== state.category) return false;
    if (state.district && item.district !== state.district) return false;
    if (state.price && (!item.price || item.price > Number(state.price))) return false;
    if (state.scene && !(item.scenes || []).includes(state.scene)) return false;
    return true;
  }).sort((a, b) => {
    const star = Number(b.starred) - Number(a.starred);
    if (star) return star;
    return (b.comfortScore + b.intimacyScore) - (a.comfortScore + a.intimacyScore);
  });
}

function renderLibrary() {
  current = filteredRestaurants();
  if (!current.find((item) => item.id === selectedId)) {
    selectedId = current[0]?.id || "";
  }
  els.restaurantList.innerHTML = current.length
    ? current.map(renderRestaurantCard).join("")
    : `<div class="empty">没有找到合适餐厅，换个条件试试。</div>`;
  document.querySelectorAll(".restaurant-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedId = card.dataset.id;
      renderLibrary();
    });
  });
  renderDetail(current.find((item) => item.id === selectedId));
}

function renderRestaurantCard(item) {
  const tags = (item.tags || []).slice(0, 3).map((tag) => `<span class="tag">${safe(tag)}</span>`).join("");
  const scenes = (item.scenes || []).slice(0, 2).map((scene) => `<span class="scene">${safe(scene)}</span>`).join("");
  return `
    <article class="restaurant-card ${item.id === selectedId ? "active" : ""}" data-id="${safe(item.id)}">
      <div class="card-head">
        <div>
          <h3 class="card-title">${item.starred ? "★ " : ""}${safe(item.name)}</h3>
          <div class="card-meta">${safe(item.category)} · ${safe(item.area)} · ${yuan(item.price)}</div>
        </div>
        <div class="score ${item.starred ? "gold" : ""}">${safe(item.comfort || "-")}</div>
      </div>
      <div class="tags">${tags}${scenes}</div>
    </article>
  `;
}

function renderDetail(item) {
  if (!item) {
    els.detailPanel.innerHTML = `<div class="empty">选中一家餐厅后，这里会显示你的私人评价。</div>`;
    return;
  }
  const scenes = (item.scenes || []).map((scene) => `<span class="scene">${safe(scene)}</span>`).join("");
  const noteCard = item.note ? `
    <div class="note-box note-with-cat">
      <span class="cat-avatar" aria-hidden="true"></span>
      <span>${safe(item.note)}</span>
    </div>
  ` : "";
  els.detailPanel.innerHTML = `
    <div class="detail-title">
      <div>
        <h3>${item.starred ? "★ " : ""}${safe(item.name)}</h3>
        <div class="detail-meta">${safe(item.category)} · ${safe(item.feature || "类型未填")}</div>
      </div>
      <div class="score ${item.starred ? "gold" : ""}">${safe(item.comfort || "-")}</div>
    </div>
    <div class="detail-meta">${safe(item.city)} · ${safe(item.area)} · ${safe(item.address)} · ${yuan(item.price)}</div>
    <div class="detail-grid">
      <div class="metric"><span>用餐舒适度</span><strong>${safe(item.comfort || "-")}</strong></div>
      <div class="metric"><span>用餐亲密度</span><strong>${safe(item.intimacy || "-")}</strong></div>
      <div class="metric"><span>状态</span><strong>${safe(statusLabel(item.status))}</strong></div>
      <div class="metric"><span>上榜情况</span><strong>${safe(item.listed || "无")}</strong></div>
    </div>
    <div class="scenes">${scenes}</div>
    ${noteCard}
  `;
}

function scoreForPurpose(item, purpose, partner, budget) {
  let score = 0;
  score += item.comfortScore || 0;
  score += (item.intimacyScore || 0) * 0.45;
  if (item.starred) score += 18;
  if ((item.scenes || []).includes(purpose)) score += 32;
  if (budget && item.price && item.price <= budget) score += 16;
  if (budget && item.price && item.price > budget) score -= 35;
  if (partner === "长辈" && (item.scenes || []).includes("长辈友好")) score += 28;
  if (partner === "一个人" && (item.scenes || []).includes("一个人吃")) score += 25;
  if (partner === "暧昧对象" && (item.scenes || []).includes("仪式感")) score += 18;
  if (item.status !== "active") score -= 100;
  return score;
}

function renderRecommendations() {
  const partner = els.partnerSelect.value;
  const purpose = els.purposeSelect.value;
  const budget = Number(els.budgetSelect.value) || 0;
  const recs = data.beijing
    .filter((item) => !budget || !item.price || item.price <= budget * 1.6)
    .map((item) => ({ item, score: scoreForPurpose(item, purpose, partner, budget) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  els.recommendations.innerHTML = recs.map(({ item }, index) => `
    <article class="recommendation">
      <span class="stat-pill">推荐 ${index + 1}</span>
      <h3>${item.starred ? "★ " : ""}${safe(item.name)}</h3>
      <p>${recommendReason(item, partner, purpose, budget)}</p>
      <div class="tags">
        <span class="tag">${safe(item.area)}</span>
        <span class="tag">${yuan(item.price)}</span>
        <span class="tag">舒适度 ${safe(item.comfort || "-")}</span>
      </div>
    </article>
  `).join("");
}

function recommendReason(item, partner, purpose, budget) {
  const bits = [];
  bits.push(`适合“${partner} · ${purpose}”这个场景`);
  if (item.starred) bits.push("它被你标过星，属于私人高亮店");
  if (item.comfort) bits.push(`舒适度是 ${item.comfort}`);
  if (item.intimacy) bits.push(`亲密度是 ${item.intimacy}`);
  if (budget && item.price) bits.push(`人均约 ${Math.round(item.price)} 元，在预算附近`);
  if (item.note) bits.push(`你的备注是：“${item.note}”`);
  return bits.join("，") + "。";
}

function renderMap() {
  const config = window.ZHENGCAN_CONFIG || {};
  if (config.amapKey) {
    renderRealMap(config);
    return;
  }
  renderTasteMapFallback();
}

function renderTasteMapFallback() {
  const districts = data.stats.districts
    .filter(([district]) => districtPositions[district])
    .slice(0, 10);
  const max = Math.max(...districts.map(([, count]) => count));

  els.tasteMap.innerHTML = `
    <div class="map-title">
      <strong>北京食客图鉴</strong>
      <div class="card-meta">按你记录过的餐厅数量生成</div>
    </div>
    ${districts.map(([district, count]) => {
      const [x, y] = districtPositions[district];
      const size = 54 + (count / max) * 86;
      return `<div class="district-bubble" style="left:${x}%;top:${y}%;width:${size}px;height:${size}px;transform:translate(-50%,-50%)">
        <div>${safe(district)}<small>${count} 家</small></div>
      </div>`;
    }).join("")}
  `;

  els.mapSide.innerHTML = `
    <h3>吃得最多的区域</h3>
    ${districts.map(([district, count]) => `
      <div class="bar-row">
        <span>${safe(district)}</span>
        <span class="bar"><i style="width:${(count / max) * 100}%"></i></span>
        <strong>${count}</strong>
      </div>
    `).join("")}
    <div class="note-box">要显示真实地图，请在 <code>app/config.js</code> 填入高德 JS API Key。已有经纬度或新增表单里填写经纬度的餐厅会显示为真实点位。</div>
  `;
}

function loadAmap(config) {
  return new Promise((resolve, reject) => {
    if (window.AMap) {
      resolve(window.AMap);
      return;
    }
    if (config.securityJsCode) {
      window._AMapSecurityConfig = { securityJsCode: config.securityJsCode };
    }
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.amapKey)}`;
    script.onload = () => resolve(window.AMap);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function renderRealMap(config) {
  els.tasteMap.innerHTML = `<div class="empty">正在加载真实地图...</div>`;
  try {
    const AMap = await loadAmap(config);
    els.tasteMap.innerHTML = "";
    const map = new AMap.Map("tasteMap", {
      zoom: 11,
      center: [116.4074, 39.9042],
      viewMode: "2D",
    });
    const withCoords = data.beijing.filter((item) => item.lng && item.lat);
    withCoords.forEach((item) => {
      const marker = new AMap.Marker({
        position: [item.lng, item.lat],
        title: item.name,
        map,
      });
      marker.on("click", () => {
        renderMapRestaurantInfo(item);
      });
    });
    if (withCoords.length) {
      map.setFitView();
    }
    const geocodedCount = await geocodeMissingRestaurants(AMap, map, withCoords.length ? 80 : 120);
    els.mapSide.innerHTML = `
      <h3>点击地图上的餐厅</h3>
      <p class="card-meta">已显示 ${withCoords.length + geocodedCount} 个点位。历史 Excel 没有经纬度列，当前会临时解析一批地址，无法保证 910 家一次全部命中。</p>
      <div class="note-box">想让所有餐厅稳定显示，需要下一步把高德解析到的坐标批量缓存进数据文件。</div>
    `;
  } catch (error) {
    els.tasteMap.innerHTML = `<div class="empty">地图加载失败：${safe(error.message || "请检查高德 Key")}</div>`;
    renderTasteMapFallback();
  }
}

function renderMapRestaurantInfo(item) {
  const note = item.note ? `<div class="note-box note-with-cat"><span class="cat-avatar" aria-hidden="true"></span><span>${safe(item.note)}</span></div>` : "";
  els.mapSide.innerHTML = `
    <h3>${item.starred ? "★ " : ""}${safe(item.name)}</h3>
    <div class="detail-meta">${safe(item.category)} · ${safe(item.feature || "类型未填")}</div>
    <div class="detail-grid map-detail-grid">
      <div class="metric"><span>区域</span><strong>${safe(item.district || "-")}</strong></div>
      <div class="metric"><span>人均</span><strong>${item.price ? Math.round(item.price) : "-"}</strong></div>
      <div class="metric"><span>舒适度</span><strong>${safe(item.comfort || "-")}</strong></div>
      <div class="metric"><span>亲密度</span><strong>${safe(item.intimacy || "-")}</strong></div>
    </div>
    <div class="detail-meta">${safe(item.area || "")} ${safe(item.address || "")}</div>
    ${note}
    <button class="map-open-detail" type="button" data-id="${safe(item.id)}">打开餐厅详情</button>
  `;
  els.mapSide.querySelector(".map-open-detail")?.addEventListener("click", () => {
    selectedId = item.id;
    setView("library");
    renderLibrary();
  });
}

function geocodeOne(geocoder, query) {
  return new Promise((resolve) => {
    geocoder.getLocation(query, (status, result) => {
      const location = result?.geocodes?.[0]?.location;
      resolve(status === "complete" && location ? [location.lng, location.lat] : null);
    });
  });
}

async function geocodeMissingRestaurants(AMap, map, limit) {
  const candidates = data.beijing
    .filter((item) => item.status === "active" && !item.lng && !item.lat)
    .filter((item) => item.name && (item.address || item.area))
    .slice(0, limit);
  if (!candidates.length) return 0;

  await new Promise((resolve) => AMap.plugin("AMap.Geocoder", resolve));
  const geocoder = new AMap.Geocoder({ city: "北京" });
  let count = 0;
  for (const item of candidates) {
    const query = [item.name, item.area, item.address].filter(Boolean).join(" ");
    const point = await geocodeOne(geocoder, query);
    if (!point) continue;
    count += 1;
    const marker = new AMap.Marker({
      position: point,
      title: item.name,
      map,
    });
    marker.on("click", () => {
      renderMapRestaurantInfo(item);
    });
  }
  return count;
}

function renderClosed() {
  els.closedList.innerHTML = data.closed.map((name) => (
    `<div class="closed-item">${safe(name)}</div>`
  )).join("");
}

function renderPlaces() {
  els.placesList.innerHTML = data.goodPlaces.map((item) => `
    <article class="restaurant-card">
      <div class="card-head">
        <div>
          <h3 class="card-title">${safe(item.name)}</h3>
          <div class="card-meta">${safe([item.detail, item.placeType, item.time].filter(Boolean).join(" · ") || "好地点")}</div>
        </div>
        <div class="score">地</div>
      </div>
    </article>
  `).join("");
}

function provinceColor(count, max) {
  if (!count) return "#fffafb";
  const level = Math.max(0.18, count / max);
  const alpha = 0.22 + level * 0.58;
  return `rgba(184, 90, 98, ${alpha.toFixed(2)})`;
}

function renderNationalMap() {
  const provinces = Object.fromEntries(data.stats.provinces || []);
  const max = Math.max(1, ...Object.values(provinces));
  const provinceCells = Object.entries(provincePositions).map(([province, [x, y]]) => {
    const count = provinces[province] || 0;
    const width = province.length >= 3 ? 62 : 50;
    const height = 34;
    return `
      <g class="province-shape ${count ? "visited" : ""}" transform="translate(${x * 8} ${y * 5.6})">
        <path d="M${-width / 2},${-height / 2} L${width / 2 - 8},${-height / 2 + 2} L${width / 2},0 L${width / 2 - 7},${height / 2 - 2} L${-width / 2 + 7},${height / 2} L${-width / 2},0 Z" fill="${provinceColor(count, max)}" />
        <text text-anchor="middle" dominant-baseline="middle">${safe(province)}</text>
      </g>
    `;
  }).join("");
  els.chinaMap.innerHTML = `
    <svg class="china-outline" viewBox="0 0 800 560" role="img" aria-label="线条中国地图">
      <path class="china-shell" d="M80 165 L126 130 L112 98 L166 93 L185 70 L243 88 L310 70 L372 92 L430 88 L492 118 L548 95 L622 112 L704 156 L690 214 L730 264 L694 318 L716 374 L646 415 L580 402 L528 450 L456 438 L405 478 L333 450 L260 500 L202 452 L166 388 L112 348 L126 284 L86 228 Z" />
      <path class="china-island" d="M618 486 C648 470 674 482 682 512 C650 528 626 520 618 486 Z" />
      ${provinceCells}
    </svg>
  `;
  const top = Object.entries(provinces).sort((a, b) => b[1] - a[1]).slice(0, 12);
  els.nationalSide.innerHTML = `
    <h3>全国巡店浓度</h3>
    <p class="card-meta">共记录 ${data.stats.nationalCount} 条足迹👣</p>
    ${top.map(([province, count]) => `
      <div class="bar-row">
        <span>${safe(province)}</span>
        <span class="bar"><i style="width:${(count / max) * 100}%"></i></span>
        <strong>${count}</strong>
      </div>
    `).join("")}
  `;
}

async function boot() {
  initElements();
  const response = await fetch("./data/restaurants.json");
  data = await response.json();
  mergeLocalRestaurants();
  initStats();
  initFilters();
  bindEvents();
  renderLibrary();
  renderRecommendations();
  renderMap();
  renderClosed();
  renderPlaces();
  renderNationalMap();
}

boot().catch((error) => {
  document.body.innerHTML = `<pre style="padding:24px">${safe(error.message)}</pre>`;
});
