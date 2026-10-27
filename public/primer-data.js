/* 小嗓宝 VoicePal · 疾病概要数据（36 号）
 * 口径：docs/DISEASE-PRIMER.md；规范：starter docs/36-DISEASE-PRIMER.md。
 * 全部内容属第 ② 层（解释）：只写定义、文件、指南列举过的手段、已发生的变化。
 * 任何「你该怎么办」的判断都不在这里，固定出口是「这一句需要问你的医生」。
 *
 * 原件状态：NCCN / CSCO / AJCC / 各共识均未取得原件，未存档；
 * 各条「据二次来源」链接均为出版方页 / 官方索引 / 权威转载，2026-10-27 逐条用
 * verify-links.mjs 验活为 OK。链接可达 ≠ 原件已存档。
 * 指南版本号只在项目自己的记录里出现过「2026.1」，更新日期未核实，页码一律「页码待核」。
 */

/* 二次来源链接（36 号 §2.5）：只接受 https://，不编 URL。 */
const LINK = {
  nccn: 'https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1437',
  csco: 'https://www.sichuancancer.org/info/1601/11661.htm',
  ajcc: 'https://www.facs.org/quality-programs/cancer-programs/american-joint-committee-on-cancer/cancer-staging-systems/',
  pdl1: 'https://drugs.dxy.cn/pc/clinicalGuidelines/pQWhH-h2_xoRRW7j2r6gOxg?ky=t70PD.html',
  ici: 'https://openurl.ebsco.com/fulltext/gcd:177695074?sid=ebsco:plink:crawler-gcd&id=ebsco:gcd:177695074&crl=f&jrnl=10073639',
  mucositis: 'https://www.cndent.com/archives/94655'
};

window.DISEASE_PRIMER = {
  brand: '小嗓宝 VoicePal',
  name: '头颈癌',
  en: 'Head and Neck Cancer',
  updated: '2026-10-27',
  sections: [
    {
      id: 'definition',
      title: '定义',
      intro: '头颈癌是一组起源于头颈部（口腔、咽、喉、鼻腔与鼻窦、唾液腺等）的恶性肿瘤的统称。'
        + '原发部位决定治疗路径与功能代价，所以本台把「原发部位与范围」放在第一页，而不是先讲分期。',
      points: [
        '头颈癌不是一种病：按原发部位分口腔、口咽、喉、下咽、鼻咽、鼻腔鼻窦、唾液腺等，各部位的病理类型与治疗路径不同。',
        '病理以鳞状细胞癌为主；鼻咽癌等部位另有其病理与病毒相关背景（如 EBV）。本台只记报告原文，不做病因推断。',
        '口咽癌的 HPV 与 p16 状态单列记录；本台不据检测结果推断病因或预后，只保留原值与检测方法。',
        '分期按 AJCC 第 8 版记录（本项目原型与演示档案使用该口径）；TNM 原文照抄，不由部位推导。',
        '功能代价（发声、吞咽、气道）与原发部位、手术与放疗范围相关，本台单列「气道与造口」「声音与沟通」两页。'
      ],
      sources: [
        { org: 'AJCC', doc: 'Cancer Staging Manual, 8th ed.（头颈章节）', version: '第 8 版（年份未核实）', original: false, secondaryUrl: LINK.ajcc, page: '页码待核' },
        { org: 'NCCN', doc: 'NCCN Guidelines · Head and Neck Cancers', version: '2026.1（版本未核实）', original: false, secondaryUrl: LINK.nccn, page: '页码待核' }
      ]
    },
    {
      id: 'evidence',
      title: '医学资料规范和指南情况',
      intro: '这台工作台里出现的每一条「该查什么、该怎么记」，都应能追到下面某一份文件。'
        + '本项目对下面所有文件都没有取得原件、未存档；表格里的「据二次来源」是可点开的出版方页 / 官方索引 / 权威转载。',
      table: {
        head: ['机构', '文件', '版本 / 年份', '原件', '本台的用途'],
        rows: [
          ['NCCN', 'NCCN Guidelines · Head and Neck Cancers', '2026.1（版本与更新日期未核实）', { text: '未取得原件，据二次来源', url: LINK.nccn }, '范围参照；不引用具体条文'],
          ['CSCO', 'CSCO 头颈肿瘤诊疗指南', '2025 版（2025-07-01 发布，据执笔单位信息）', { text: '未取得原件，据二次来源', url: LINK.csco }, '仅登记其存在，不作引用依据'],
          ['AJCC', 'Cancer Staging Manual, 8th ed.（头颈章节）', '第 8 版（年份未核实）', { text: '未取得原件，据二次来源', url: LINK.ajcc }, 'TNM 分期口径（原型按第 8 版记录）'],
          ['中华医学会病理学分会等', '头颈部鳞癌 PD-L1 表达检测专家共识（中华病理学杂志 2024;53(11):1097）', '2024', { text: '未取得原件，据二次来源', url: LINK.pdl1 }, 'PD-L1 检测与判读口径；本台只记原值'],
          ['中国抗癌协会等', '复发／转移性头颈部鳞癌免疫检查点抑制剂治疗专家共识（2024 年版）（中国癌症杂志 2024;34(4)）', '2024', { text: '未取得原件，据二次来源', url: LINK.ici }, '复发 / 转移情形的手段列举'],
          ['中华口腔医学会', '放（化）疗性口腔黏膜炎的预防和治疗专家共识（团体标准公告第 74 项；标准号未核，本台以占位记录）', '38 页', { text: '未取得原件，据二次来源', url: LINK.mucositis }, '黏膜炎分级口径对照；本台采用 WHO 分级，不采用 CTCAE']
        ]
      },
      points: [
        '指南给的是「通常怎么做」，不是「你该怎么做」。版本号必须写清：同一份指南隔一年，条目会变。',
        'NCCN 的版本号只在项目自己的演示数据里记为 2026.1，更新日期未核实；未取得原件之前，本台不引用其条文。',
        '未取得原件的文件只记「存在」与「大致讲什么」，页码一律写待核。',
        '口咽癌与非口咽癌的分期规则不同，本台按报告与医生记录的口径照抄，不自行判断适用哪一套。'
      ],
      sources: [
        { org: 'NCCN', doc: 'NCCN Guidelines · Head and Neck Cancers', version: '2026.1（未核实）', original: false, secondaryUrl: LINK.nccn, page: '页码待核' },
        { org: 'CSCO', doc: 'CSCO 头颈肿瘤诊疗指南', version: '2025 版（2025-07-01 发布，据执笔单位信息）', original: false, secondaryUrl: LINK.csco, page: '页码待核' },
        { org: 'AJCC', doc: 'Cancer Staging Manual, 8th ed.（头颈章节）', version: '第 8 版（年份未核实）', original: false, secondaryUrl: LINK.ajcc, page: '页码待核' },
        { org: '中华医学会病理学分会等', doc: '头颈部鳞癌 PD-L1 表达检测专家共识', version: '2024（中华病理学杂志 2024;53(11):1097）', original: false, secondaryUrl: LINK.pdl1, page: '页码待核' },
        { org: '中国抗癌协会等', doc: '复发／转移性头颈部鳞癌免疫检查点抑制剂治疗专家共识（2024 年版）', version: '2024（中国癌症杂志 2024;34(4)）', original: false, secondaryUrl: LINK.ici, page: '页码待核' },
        { org: '中华口腔医学会', doc: '放（化）疗性口腔黏膜炎的预防和治疗专家共识（团体标准公告第 74 项）', version: '38 页（标准号未核，本台以占位记录）', original: false, secondaryUrl: LINK.mucositis, page: '页码待核' }
      ]
    },
    {
      id: 'landscape',
      title: '目前治疗全景概要',
      intro: '下面按原发部位、病期与线序列出指南与共识里出现过的手段类别。这是「世界上大致有哪些办法」的地图，'
        + '不是给你排的先后顺序，也不含任何剂量、疗程与适用条件——那些必须由医生按部位、病理与影像决定。',
      groups: [
        {
          label: '初诊（按原发部位与病期）',
          points: [
            '手术：原发灶切除与颈淋巴结清扫被列出，术式与切除范围按手术记录原文照抄。',
            '放疗：外照射单独使用或术后使用都被列出；照射范围按放疗记录原文记录。',
            '同步放化疗：在部分部位与病期被列为可讨论选项。',
            '靶向治疗：EGFR 单抗与放疗联合的情形被列出。',
            '免疫检查点抑制剂：在复发 / 转移情形被列出，并按 PD-L1 CPS 等检测结果分层。'
          ]
        },
        {
          label: '喉功能保留与发声',
          points: [
            '保喉策略：部分喉切除、放疗或放化疗作为保留喉部的路径被列出；是否适用由部位、分期与医生评估决定。',
            '全喉切除后的发声方式：食管音、发音管（TEP）、电子喉都被列出。',
            '造口与气道护理：造口日常、耗材与堵管 / 脱管的应对被单列为记录项，本台不给处置建议。'
          ]
        },
        {
          label: '复发 / 转移后',
          points: [
            '再次手术、再次放疗与全身治疗（化疗、靶向、免疫）都被列出。',
            '临床研究：指南与共识把「参加登记良好的临床试验」列为一项正式选项。'
          ]
        },
        {
          label: '贯穿全程的两件事',
          points: [
            '吞咽与营养：进食途径（口进 / 胃管等）与体重按记录原文呈现；本台不给食谱与补充剂剂量。',
            '随访与观察项：颈部 + 胸部影像、喉镜 / 造口检查按医生给的间隔记录；口腔黏膜炎按 WHO 分级对照，放射性骨坏死与牙关紧闭只列观察项，本台不下判断。'
          ]
        }
      ],
      points: [
        '以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。'
      ],
      sources: [
        { org: 'NCCN', doc: 'NCCN Guidelines · Head and Neck Cancers', version: '2026.1（未核实）', original: false, secondaryUrl: LINK.nccn, page: '页码待核' },
        { org: '中国抗癌协会等', doc: '复发／转移性头颈部鳞癌免疫检查点抑制剂治疗专家共识（2024 年版）', version: '2024', original: false, secondaryUrl: LINK.ici, page: '页码待核' }
      ]
    },
    {
      id: 'trend',
      title: '发展趋势',
      intro: '这一段只写已经发生的事：哪份文件发布、哪一年刊出、哪条标准还停在草案。'
        + '不写预测，不做评价，也不给任何倾向；查不到版本号的不写。',
      points: [
        '2024 年：《头颈部鳞癌 PD-L1 表达检测专家共识》刊于中华病理学杂志 2024;53(11):1097。',
        '2024 年：《复发／转移性头颈部鳞癌免疫检查点抑制剂治疗专家共识（2024 年版）》刊于中国癌症杂志 2024;34(4)。',
        '2025-07-01：四川省肿瘤医院（指南执笔单位）发布信息显示，《CSCO 头颈部肿瘤诊疗指南 2025 版》在 2025 CSCO 指南大会发布；本台未取得原件。',
        '2026-10-25：本项目桌面检索记录显示，《放（化）疗性口腔黏膜炎的预防和治疗专家共识》标准号未核（本台以 T/XXX XXXX—XXXX 占位记录）；本项目未取得原件。',
        '2026 年：NCCN 头颈癌指南的版本号在项目演示数据中记为 2026.1；本项目未取得原件，更新日期未核实。'
      ],
      sources: [
        { org: '中华医学会病理学分会等', doc: '头颈部鳞癌 PD-L1 表达检测专家共识', version: '2024（中华病理学杂志 2024;53(11):1097）', original: false, secondaryUrl: LINK.pdl1, page: '页码待核' },
        { org: '中国抗癌协会等', doc: '复发／转移性头颈部鳞癌免疫检查点抑制剂治疗专家共识（2024 年版）', version: '2024（中国癌症杂志 2024;34(4)）', original: false, secondaryUrl: LINK.ici, page: '页码待核' },
        { org: '中华口腔医学会', doc: '放（化）疗性口腔黏膜炎的预防和治疗专家共识（团体标准公告第 74 项）', version: '38 页（标准号未核，本台以占位记录）', original: false, secondaryUrl: LINK.mucositis, page: '页码待核' },
        { org: 'NCCN', doc: 'NCCN Guidelines · Head and Neck Cancers', version: '2026.1（未核实）', original: false, secondaryUrl: LINK.nccn, page: '页码待核' }
      ]
    }
  ]
}
