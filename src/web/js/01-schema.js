/* ===== 01 数据字典：16 大类 / 子类型 / 专属字段 / 账目模板 ===== */
window.App = window.App || {};
(function (A) {
  'use strict';

  var f = function (k, l, t, x) { return Object.assign({ key: k, label: l, type: t || 'text' }, x || {}); };
  var S = function (id, name, fields, subs) { return { id: id, name: name, fields: fields || [], subs: subs || [] }; };
  var T = function (k, l, fields, opt) { return Object.assign({ key: k, label: l, fields: fields || [] }, opt || {}); };
  var C = function (id, name, icon, color, subs) { return { id: id, name: name, icon: icon, color: color, subs: subs, builtin: true, fields: [] }; };
  A._f = f; A._C = C; A._S = S; A._T = T;

  A.STATUS = ['在用', '收纳闲置', '已丢弃', '已送人'];
  A.PALETTE = ['#2f9e91','#4a89d6','#e0824b','#7262fd','#61ddaa','#e4b53c','#e8684a','#65789b','#78d3f8','#f6bd16','#9270ca','#ff99c3','#5ad8a6','#269a99','#6dc8ec','#bdd2fd','#8c9ba5','#c58af9'];

  /* 通用基础字段（每类都有） */
  A.BASE_FIELDS = [
    f('purchaseDate', '购买日期', 'date'),
    f('price', '价格（元）', 'number', { unit: '元', def: '' }),
    f('qty', '数量', 'number', { def: 1 }),
    f('location', '存放位置', 'text', { placeholder: '如：卧室柜子第二层 / 厨房吊柜' }),
    f('status', '状态', 'select', { options: A.STATUS, def: '在用' }),
    f('note', '备注', 'textarea', { placeholder: '写点什么，方便以后找得到' })
  ];

  /* 复用的字段片段 */
  var prodDate = function () { return f('prodDate', '生产日期', 'date'); };
  var shelfLife = function () { return f('shelfLife', '保质期（天）', 'number', { hint: '填生产日期+保质期会自动算出到期日' }); };
  var expiry = function (label) { return f('expiryDate', label || '到期日', 'date', { hint: '可留空由系统自动计算，也可手动修改' }); };
  var openDate = function (req) { return f('openDate', '开封日期', 'date', { hint: req ? '建议填写：开封后保质期从这里算起' : '开封后保质期从这一天算起' }); };
  var remain = function () { return f('remain', '余量', 'select', { options: ['满', '半', '快用完', '充足'] }); };
  var brand = function () { return f('brand', '品牌型号', 'text'); };
  var warranty = function () { return f('warrantyExpiry', '保修到期', 'date'); };

  /* 复用的子表片段 */
  var maintT = function (label) {
    return T('maintenance', label || '保养记录', [
      f('date', '日期', 'date'), f('mileage', '里程(km)', 'number'),
      f('project', '项目', 'text', { placeholder: '如：更换机油机滤 / 打气 / 链条上油' }),
      f('cost', '费用(元)', 'number'), f('shop', '店家', 'text')
    ]);
  };
  var insT = function () {
    return T('insurance', '保险记录', [
      f('company', '保险公司', 'text'), f('type', '险种', 'text', { placeholder: '如：交强险 / 车损险' }),
      f('startDate', '起始日期', 'date'), f('endDate', '到期日期', 'date'),
      f('premium', '保费(元)', 'number')
    ]);
  };
  var fuelT = function () {
    return T('fuel', '加油记录', [
      f('date', '日期', 'date'),
      f('oilNo', '油号', 'select', { options: ['92#', '95#', '98#', '0#柴油', '充电'] }),
      f('unitPrice', '单价(元/L)', 'number'), f('amount', '金额(元)', 'number'),
      f('mileage', '里程数(km)', 'number')
    ], { kind: 'fuel' });
  };

  /* ---------- 16 大类 ---------- */
  A.CATEGORIES = [
    C('travel', '出行工具', '🚗', '#5B8FF9', [
      S('car', '汽车', [
        f('plate', '车牌号', 'text'), brand(),
        f('inspectionDate', '年检到期日期', 'date'),
        f('insuranceEnd', '保险到期日期', 'date', { hint: '也可在下方保险记录里逐条登记' }),
        f('nextMaintenance', '下次保养日期', 'date'),
        f('fuelType', '燃油类型', 'select', { options: ['汽油', '柴油', '混动', '纯电'] })
      ], [maintT(), insT(), fuelT()]),
      S('ebike', '电动车/摩托车', [
        f('plate', '车牌（如有）', 'text'), brand(),
        f('chargerLocation', '充电器存放位置', 'text'),
        f('insuranceEnd', '保险到期日期', 'date'),
        f('nextMaintenance', '下次保养日期', 'date')
      ], [
        T('battery', '电池更换记录', [f('date', '更换日期', 'date'), f('cost', '费用(元)', 'number'), f('note', '说明', 'text')]),
        insT(), maintT()
      ]),
      S('bike', '自行车', [brand()], [maintT('保养记录（打气/链条上油）')])
    ]),

    C('food', '食品饮品', '🍎', '#61DDAA', [
      S('grain', '米面粮油', [prodDate(), shelfLife(), expiry(), openDate()]),
      S('snack', '零食饮料', [
        prodDate(), shelfLife(), expiry('到期日（自动算，可手改）'), openDate(),
        f('storage', '存放处', 'select', { options: ['冰箱', '橱柜', '零食箱', '其他'] })
      ]),
      S('seasoning', '调味品', [
        prodDate(), shelfLife(), openDate(true),
        f('paoDays', '开封后保质期（天）', 'number', { hint: '如 180，开封后通常更短' }), expiry()
      ]),
      S('fresh', '生鲜短记', [f('suggestUseBy', '建议食用期限', 'date')]),
      S('supplement', '保健品', [expiry('有效期至'), f('dailyDose', '每日用量', 'text'), f('remainQty', '剩余量', 'text')])
    ]),

    C('clothing', '衣物鞋帽', '👕', '#F6BD16', [
      S('apparel', '服装/鞋', [
        f('brand', '品牌', 'text'), f('size', '尺码', 'text'), f('color', '颜色', 'text'),
        f('seasons', '季节', 'multiselect', { options: ['春', '夏', '秋', '冬'] })
      ]),
      S('bag', '箱包', [f('purpose', '用途', 'select', { options: ['通勤', '旅行', '其他'] })]),
      S('accessory', '配饰（手表/眼镜/皮带）', [f('brand', '品牌', 'text')], [
        T('watch', '保养/换电池记录', [f('date', '日期', 'date'), f('project', '项目', 'text'), f('cost', '费用(元)', 'number')])
      ])
    ]),

    C('digital', '家电数码', '📺', '#7262FD', [
      S('bigAppliance', '大家电', [
        brand(), warranty(),
        f('cleanCycleDays', '清洗保养周期（天）', 'number', { hint: '如空调滤网、洗衣机槽清洗；填了会自动提醒' }),
        f('lastClean', '上次清洗日期', 'date')
      ]),
      S('smallAppliance', '小家电', [
        brand(), warranty(),
        f('cleanCycleDays', '清洗保养周期（天）', 'number'), f('lastClean', '上次清洗日期', 'date')
      ]),
      S('device', '数码设备', [
        brand(), f('serial', '序列号', 'text'), warranty(),
        f('accessories', '配件清单', 'textarea', { placeholder: '充电器、数据线、保护壳…' })
      ]),
      S('cable', '线材电池耗材', [remain()])
    ]),

    C('furniture', '家具家居', '🛋️', '#78D3F8', [
      S('furniture', '家具', [f('material', '材质', 'text'), f('room', '所在房间', 'text'), warranty()]),
      S('bedding', '床品', [
        f('material', '材质', 'text'),
        f('washCycleDays', '换洗周期（天）', 'number', { hint: '填了会自动提醒' }),
        f('lastWash', '上次换洗日期', 'date')
      ]),
      S('lamp', '灯具窗帘', [f('installDate', '安装日期', 'date'), f('bulbSpec', '灯泡规格型号', 'text', { hint: '方便日后更换' })])
    ]),

    C('kitchen', '厨房用品', '🍳', '#FF9D4D', [
      S('pan', '锅具', [
        f('material', '材质', 'text'),
        f('coated', '不粘涂层', 'select', { options: ['是', '否'] }),
        f('suggestReplaceDate', '建议更换日期', 'date', { hint: '不粘锅默认按购买日期 +2 年自动算出，可手改' })
      ]),
      S('tableware', '餐具/小工具/水杯', [])
    ]),

    C('cleaning', '清洁洗护美妆', '🧴', '#65789B', [
      S('cleaner', '清洁用品', [remain(), f('dangerNote', '存放注意', 'text', { placeholder: '如：84 消毒液勿与洁厕灵混用' })]),
      S('laundry', '洗衣护衣', [remain()]),
      S('personal', '个人洗护', [openDate(), remain()]),
      S('cosmetic', '化妆品护肤品', [
        prodDate(), shelfLife(),
        f('paoMonths', '开封后保质期', 'select', { options: ['6', '12', '24'], hint: '单位：月（6M / 12M / 24M）' }),
        openDate(true), expiry('到期日（自动算，可手改）')
      ])
    ]),

    C('health', '药品健康', '💊', '#E8684A', [
      S('medicine', '药品', [prodDate(), expiry('有效期至'), f('usage', '用途/适应症', 'text')]),
      S('medicalDevice', '医疗器械', [
        brand(),
        f('calibrationCycleDays', '电池更换/校准周期（天）', 'number'),
        f('lastCalibration', '上次校准/换电池', 'date')
      ]),
      S('firstaid', '急救包', [], [
        T('checklist', '清单核对记录', [f('date', '核对日期', 'date'), f('content', '核对内容', 'text', { placeholder: '绷带、碘伏、创可贴…' }), f('complete', '是否齐备', 'select', { options: ['齐备', '需补充'] })])
      ])
    ]),

    C('daily', '日用消耗品', '🧻', '#5AD8A6', [
      S('consumable', '纸巾/垃圾袋/电池/灯泡', [remain()]),
      S('filter', '滤芯耗材', [
        f('filterModel', '适配型号', 'text'),
        f('installDate', '安装日期', 'date'),
        f('replaceCycleDays', '更换周期（天）', 'number', { hint: '如 180；自动算出下次更换日并提醒' }),
        f('nextReplaceDate', '下次更换日', 'date', { hint: '可留空自动计算，也可手改' })
      ])
    ]),

    C('docs', '证件文件', '📄', '#9270CA', [
      S('cert', '证件', [f('certType', '证件类型', 'text', { placeholder: '身份证/驾照/护照…' }), expiry('有效期至')]),
      S('contract', '合同票据', [f('signDate', '签订/开具日期', 'date'), expiry('有效期至')]),
      S('manual', '说明书保修卡', [f('relatedDevice', '对应哪个电器', 'text')]),
      S('key', '备用钥匙', [f('purpose', '用途', 'text')])
    ]),

    C('books', '图书文娱', '📚', '#FF99C3', [
      S('book', '图书', [f('author', '作者', 'text'), f('readStatus', '阅读状态', 'select', { options: ['未读', '已读', '在读'] })]),
      S('collectible', '收藏品/乐器', [f('kind', '类型', 'text')], [
        T('instrument', '换弦/保养记录', [f('date', '日期', 'date'), f('project', '项目', 'text'), f('cost', '费用(元)', 'number')])
      ])
    ]),

    C('sports', '运动户外', '⚽', '#269A99', [
      S('fitness', '健身器材', []),
      S('outdoor', '户外装备', []),
      S('luggage', '行李箱', [f('size', '尺寸', 'text', { placeholder: '如 20 寸' }), f('rodNote', '拉杆/轮子状态', 'text')])
    ]),

    C('pet', '宠物用品', '🐾', '#FF9D4D', [
      S('petfood', '粮食/用品', [expiry('到期日'), remain()]),
      S('vaccine', '疫苗/驱虫', [], [
        T('vaccineRecords', '疫苗/驱虫记录', [
          f('date', '日期', 'date'), f('type', '类型', 'text', { placeholder: '如：狂犬疫苗 / 体内驱虫' }),
          f('nextDate', '下次时间', 'date')
        ], { kind: 'vaccine' })
      ])
    ]),

    C('plant', '绿植花卉', '🌿', '#5AD8A6', [
      S('plant', '绿植', [
        f('variety', '品种', 'text'),
        f('waterCycleDays', '浇水周期（天）', 'number', { hint: '如 3，表示每 3 天浇一次，自动提醒' }),
        f('lastWatered', '上次浇水日期', 'date'),
        f('fertilizeCycleDays', '施肥周期（天）', 'number', { hint: '可选' }),
        f('lastFertilized', '上次施肥日期', 'date')
      ])
    ]),

    C('tools', '工具五金', '🔧', '#6DC8EC', [
      S('tool', '工具', []),
      S('parts', '备用零件耗材', [f('spec', '规格型号', 'text'), remain()])
    ]),

    C('other', '其他杂物', '📦', '#BDD2FD', [
      S('misc', '通用', [])
    ])
  ];

  /* ---------- 账目周期项目模板 ---------- */
  A.CYCLES = [
    { v: 'monthly', l: '每月', days: 30 },
    { v: 'bimonthly', l: '每两月', days: 60 },
    { v: 'quarterly', l: '每季度', days: 90 },
    { v: 'halfyear', l: '每半年', days: 182 },
    { v: 'yearly', l: '每年', days: 365 },
    { v: 'custom', l: '自定义', days: 0 }
  ];
  A.BILL_TEMPLATES = [
    { id: 'rent', name: '房租', icon: '🏠', cycle: 'monthly', due: 'dayOfMonth', fields: [
      f('dueDay', '交租日（每月几号）', 'number', { hint: '如 5，表示每月 5 号交租' }),
      f('contractStart', '合同起始日期', 'date'), f('contractEnd', '合同到期日期', 'date'),
      f('deposit', '押金金额(元)', 'number'), f('contact', '房东/中介联系方式', 'text')
    ] },
    { id: 'water', name: '水费', icon: '💧', cycle: 'monthly', due: 'cycle', fields: [f('accountNo', '户号', 'text'), f('lastReading', '上次抄表读数', 'text')] },
    { id: 'electric', name: '电费', icon: '⚡', cycle: 'monthly', due: 'cycle', fields: [f('accountNo', '户号', 'text'), f('lastReading', '上次抄表读数', 'text')] },
    { id: 'gas', name: '燃气费', icon: '🔥', cycle: 'bimonthly', due: 'cycle', fields: [f('accountNo', '户号', 'text'), f('lastReading', '上次抄表读数', 'text')] },
    { id: 'property', name: '物业费', icon: '🏢', cycle: 'yearly', due: 'cycle', fields: [f('payMonths', '缴费月份', 'text', { placeholder: '如：每年 1 月' })] },
    { id: 'internet', name: '网费/宽带', icon: '🌐', cycle: 'yearly', due: 'fixedDate', fields: [f('expiryDate', '到期日期', 'date')] },
    { id: 'phone', name: '话费', icon: '📱', cycle: 'monthly', due: 'dayOfMonth', fields: [f('dueDay', '每月扣费日', 'number')] },
    { id: 'car', name: '车辆支出', icon: '🚗', cycle: 'custom', due: 'cycle', fields: [f('costType', '支出类型', 'select', { options: ['油费', '保险', '保养', '年检', '其他'] })] },
    { id: 'subscription', name: '订阅会员', icon: '🎬', cycle: 'monthly', due: 'fixedDate', fields: [f('expiryDate', '下次续费日', 'date'), f('plan', '套餐', 'text')] },
    { id: 'insurance', name: '家庭保险', icon: '🛡️', cycle: 'yearly', due: 'fixedDate', fields: [f('company', '保险公司', 'text'), f('expiryDate', '到期日', 'date')] },
    { id: 'custom', name: '自定义项目', icon: '➕', cycle: 'monthly', due: 'cycle', fields: [f('memo', '说明', 'text')] }
  ];

  /* 提醒提前天数设置项 */
  A.ADVANCE_DEFS = [
    { key: 'food', label: '食品 / 药品保质期', def: 7, icon: '🍎' },
    { key: 'cosmetic', label: '化妆品开封后到期', def: 14, icon: '💄' },
    { key: 'cert', label: '证件 / 合同到期', def: 30, icon: '📄' },
    { key: 'bill', label: '房租 / 缴费 / 续费', def: 3, icon: '💰' },
    { key: 'car', label: '车险 / 年检 / 保养', def: 15, icon: '🚗' },
    { key: 'other', label: '滤芯 / 浇水 / 更换等', def: 7, icon: '🔔' }
  ];

  A.getCategory = function (id) {
    var list = A.db ? A.db.categories : A.CATEGORIES;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  };
  A.getSubtype = function (cat, sid) {
    if (!cat) return null;
    var subs = cat.subs || [];
    for (var i = 0; i < subs.length; i++) if (subs[i].id === sid) return subs[i];
    return subs[0] || { id: 'misc', name: '通用', fields: [], subs: [] };
  };
  /* 类别自定义字段 + 子类型专属字段合并 */
  A.getFields = function (cat, sub) {
    return (cat && cat.fields ? cat.fields : []).concat(sub && sub.fields ? sub.fields : []);
  };
  A.getSubTables = function (sub) { return (sub && sub.subs) || []; };
  A.catName = function (id) { var c = A.getCategory(id); return c ? c.name : '未分类'; };
  A.catIcon = function (id) { var c = A.getCategory(id); return c ? c.icon : '📦'; };

})(window.App);
