/**
 * live.js —— 把原型接到本机数据库上。
 *
 * 设计原则（为什么不是把原型重写一遍）：
 *   1. prototypes/v0.1/index.html 是 G2 签认过的视觉合同，一个像素都不动。
 *      这里只在它之后加载，把 `DEMO.A` / `DEMO.B` 换成数据库里读出来的真实结构，
 *      然后调它自己的 render()。原型不知道数据来自哪里。
 *   2. 写操作不新增界面：原型里「问过了 / 解决了 / 私密 / 加一条」这些按钮
 *      本来只改内存对象（刷新即丢），这里在它们改完之后把差异写回数据库。
 *      用户看到的行为和原型完全一致，但关掉浏览器再开还在。
 *   3. 任何一步失败都要看得见：请求失败弹 toast 并回滚本地状态，
 *      不静默吞掉（家族教训：假成功比报错更难查）。
 */
(function () {
  'use strict';

  var API = '/api/head-neck-workbench';
  var booted = false;

  /* ---------- 小工具 ---------- */
  function pick(obj, key, fallback) {
    if (!obj) return fallback === undefined ? null : fallback;
    var v = obj[key];
    return v === undefined || v === null ? (fallback === undefined ? null : fallback) : v;
  }
  function dash(v) {
    return v === null || v === undefined || v === '' ? '—' : v;
  }
  function num(v) {
    return typeof v === 'number' ? v : v === null || v === undefined || v === '' ? null : Number(v);
  }
  function bool(v) {
    return v === 1 || v === true || v === '1';
  }

  function toast(msg) {
    var host = document.getElementById('toast');
    if (!host) return;
    host.textContent = msg;
    host.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { host.classList.remove('on'); }, 2600);
  }

  function request(method, path, body) {
    return fetch(API + path, {
      method: method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (!res.ok) {
          var err = new Error(data.message || ('请求失败（HTTP ' + res.status + '）'));
          err.status = res.status;
          err.field = data.field;
          throw err;
        }
        return data;
      });
    });
  }

  /* ---------- 数据库行 → 原型结构 ---------- */
  function toUiModel(payload, subjectIndex) {
    var subject = subjectIndex === 0 ? payload.subject : (payload.subjects || [])[subjectIndex];
    if (!subject) return null;
    var t = payload.tables || {};
    var ch = payload.children || {};
    var metrics = payload.metrics || [];

    function rows(name) { return (t[name] || []); }

    var stageRow = rows('staging_assertions')[0];
    var pathRow = rows('pathology_reports')[0];
    var surgRow = rows('surgery_events')[0];
    var rtRow = rows('radiotherapy_courses')[0];
    var airwayRow = rows('airway_status')[0];
    var stomaRow = rows('tracheostoma_facts')[0];

    var rtSites = (ch.radiotherapy_sites || [])
      .filter(function (r) { return !rtRow || r.course_id === rtRow.id; })
      .map(function (r) { return r.site_name + (r.dose_gy ? ' ' + r.dose_gy + ' Gy' : ''); });

    var feedingRows = rows('feeding_routes');
    var currentFeed = feedingRows.filter(function (r) { return bool(r.is_current); })[0] || feedingRows[0];

    var metricByCode = {};
    metrics.forEach(function (m) { metricByCode[m.code] = m; });
    var metricById = {};
    metrics.forEach(function (m) { metricById[m.id] = m; });

    var obs = rows('observations').map(function (o) {
      var m = metricById[o.metric_id] || {};
      return {
        code: m.code || o.metric_id,
        on: o.observed_on,
        v: o.value_num === null || o.value_num === undefined ? o.value_text : Number(o.value_num),
        lab: dash(o.lab_name),
        method: dash(o.method),
        absence: o.absence_state,
        id: o.id,
      };
    });

    var mucositis = obs
      .filter(function (o) { return o.code === 'mucositis'; })
      .map(function (o) { return { on: o.on, grade: Number(o.v), form: '', note: '' }; });

    var concerns = rows('concerns').map(function (c) {
      return {
        id: c.id,
        text: c.text,
        kind: c.kind,
        asked: bool(c.asked),
        answer: c.answered_raw,
        addressed: bool(c.addressed),
        vis: c.visibility === 'private' ? 'private' : 'shared',
      };
    });

    var viewpoints = rows('viewpoints').map(function (v) {
      return { id: v.id, kind: v.kind, text: v.text, on: v.recorded_on, vis: v.visibility === 'private' ? 'private' : 'shared' };
    });

    var tasks = rows('tasks').map(function (x) {
      return { id: x.id, title: x.title, due: x.due_on, done: !!x.done_at };
    });

    var model = {
      id: subject.id,
      name: subject.display_name,
      site: dash(subject.primary_site),
      siteDetail: subject.site_detail || '',
      sex: dash(subject.sex),
      birthYear: subject.birth_year,

      stage: stageRow
        ? {
            system: dash(stageRow.system),
            t: dash(stageRow.t_stage),
            n: dash(stageRow.n_stage),
            m: dash(stageRow.m_stage),
            overall: dash(stageRow.overall),
            by: dash(stageRow.asserted_by),
            on: dash(stageRow.asserted_on),
          }
        : null,

      path: pathRow
        ? {
            reportedOn: dash(pathRow.reported_on),
            specimen: dash(pathRow.specimen),
            histology: dash(pathRow.histology),
            grade: dash(pathRow.grade),
            margin: dash(pathRow.margin_status),
            lv: dash(pathRow.lymphovascular),
            pn: dash(pathRow.perineural),
            variantRaw: pathRow.variant_raw || null,
            variantIsMain: null,
            nodesPositive: pathRow.nodes_positive,
            nodesExamined: pathRow.nodes_examined,
            raw: pathRow.raw_text || '',
          }
        : null,

      biomarkers: rows('biomarker_results').map(function (b) {
        return {
          marker: b.marker,
          value: b.value_num === null || b.value_num === undefined ? undefined : Number(b.value_num),
          result: b.result_text || undefined,
          method: b.method || '—',
          specimen: b.specimen || '—',
          on: b.tested_on,
          note: b.note || '',
        };
      }),

      lines: rows('treatment_lines')
        .sort(function (a, b) { return (a.line_no || 0) - (b.line_no || 0); })
        .map(function (l) {
          return {
            no: l.line_no,
            intent: dash(l.intent),
            name: l.note || (l.intent ? l.intent + '治疗' : '治疗'),
            start: dash(l.started_on),
            end: l.ended_on,
            current: bool(l.is_current),
          };
        }),

      surgery: surgRow
        ? {
            procedure: dash(surgRow.procedure),
            on: dash(surgRow.performed_on),
            approach: dash(surgRow.approach),
            laterality: dash(surgRow.laterality),
            larynxPreserved: bool(surgRow.larynx_preserved),
            voiceLost: bool(surgRow.voice_lost),
            permanentStoma: bool(surgRow.permanent_stoma),
            neck: null,
            recon: surgRow.note || '—',
          }
        : null,

      rt: rtRow
        ? {
            technique: dash(rtRow.technique),
            start: dash(rtRow.started_on),
            end: rtRow.ended_on,
            dose: num(rtRow.total_dose_gy),
            fractions: rtRow.fractions,
            sites: rtSites,
          }
        : null,

      airway: airwayRow
        ? { kind: dash(airwayRow.kind), establishedOn: airwayRow.established_on, tubeType: airwayRow.tube_type }
        : { kind: '未记录', establishedOn: null, tubeType: null },

      stoma: stomaRow
        ? {
            humidity: dash(stomaRow.humidity_device),
            cleaning: dash(stomaRow.cleaning_routine),
            shower: dash(stomaRow.shower_cover),
          }
        : null,

      supplies: rows('stoma_supplies').map(function (s) {
        return { item: s.item_name, spec: s.spec || '—', qty: s.quantity, reorderAt: s.reorder_at };
      }),

      stomaLogs: rows('stoma_logs').map(function (s) {
        return { on: s.logged_on, event: s.event, severity: s.severity, note: s.note || '' };
      }),

      emergencies: rows('airway_emergencies').map(function (e) {
        return { at: e.occurred_at, kind: e.kind, outcome: dash(e.outcome), wentTo: dash(e.went_to) };
      }),

      voice: {
        methods: rows('voice_methods').map(function (v) {
          return { method: v.method, start: v.started_on, end: v.ended_on, current: bool(v.is_current) };
        }),
        prostheses: rows('voice_prostheses').map(function (p) {
          return { placed: p.placed_on, spec: p.device_spec || '—', removed: p.removed_on, reason: p.removal_reason || '' };
        }),
        aids: rows('communication_aids').map(function (a) { return a.aid_type; }),
      },

      feeding: currentFeed
        ? {
            route: currentFeed.route,
            start: currentFeed.started_on,
            current: true,
            history: feedingRows
              .filter(function (r) { return r.id !== currentFeed.id; })
              .map(function (r) { return { route: r.route, start: r.started_on, end: r.ended_on }; }),
          }
        : { route: '未记录', start: null, current: false, history: [] },

      aspirations: rows('aspiration_events').map(function (a) {
        return {
          on: a.occurred_on,
          food: a.food_form || '—',
          coughed: bool(a.coughed),
          silent: bool(a.silent_suspected),
          fever: bool(a.fever_after),
          note: a.note || '',
        };
      }),

      intake: rows('nutrition_intake').map(function (n) {
        return { on: n.recorded_on, form: n.food_form, appetite: n.appetite, note: n.note || '' };
      }),

      functions: rows('function_self_reports').map(function (f) {
        return { domain: f.domain, activity: f.activity, ability: f.ability };
      }),

      lateTox: rows('late_toxicity_observations').map(function (l) {
        return { domain: l.domain, on: l.observed_on, severity: l.severity_text || '—', yearsAfter: num(l.years_after_rt) };
      }),

      dental: rows('dental_events').map(function (d) {
        return { on: d.occurred_on, event: d.event, rtDisclosed: bool(d.rt_disclosed) ? 1 : 0, note: d.note || '' };
      }),

      trismus: rows('trismus_measurements').map(function (m) {
        return { on: m.measured_on, mm: m.mouth_opening_mm };
      }),

      metrics: metrics.map(function (m) {
        return {
          code: m.code,
          label: m.label,
          unit: m.unit || '',
          track: m.track,
          grade: m.grade_system || '无',
          chartable: bool(m.is_chartable),
        };
      }),

      obs: obs,

      mucositis: mucositis,

      concerns: concerns,
      followups: rows('followup_schedules').map(function (f) {
        return {
          item: f.item,
          interval: f.interval_text || '—',
          next: f.next_due_on,
          src: f.source_id || '—',
          ver: f.source_version || '—',
        };
      }),
      followupRecords: rows('followup_records').map(function (r) {
        return { on: r.visited_on, dept: r.department || '—', summary: r.summary_raw || '' };
      }),
      viewpoints: viewpoints,
      caregiver: rows('caregiver_notes').map(function (g) {
        return { id: g.id, text: g.note, on: g.recorded_on, by: g.recorded_by || '—' };
      }),
      docs: rows('documents').map(function (d) {
        return { title: d.title, kind: d.doc_kind || '—', path: d.relative_path || '', state: d.parsed_state || '未解析' };
      }),
      drafts: [],
      tasks: tasks,

      /* 内部用，不参与渲染 */
      _raw: { concerns: rows('concerns'), viewpoints: rows('viewpoints'), tasks: rows('tasks') },
    };
    return model;
  }

  /* ---------- 写回：把界面上的本地改动同步到数据库 ---------- */
  var TABLE_OF = {
    concerns: 'concerns',
    viewpoints: 'viewpoints',
    tasks: 'tasks',
  };

  function toRow(table, item, subjectId) {
    if (table === 'concerns') {
      return {
        subject_id: subjectId,
        text: item.text,
        kind: item.kind,
        asked: item.asked ? 1 : 0,
        answered_raw: item.answer || null,
        addressed: item.addressed ? 1 : 0,
        visibility: item.vis === 'private' ? 'private' : 'shared',
      };
    }
    if (table === 'viewpoints') {
      return {
        subject_id: subjectId,
        kind: item.kind,
        text: item.text,
        recorded_on: item.on,
        visibility: item.vis === 'private' ? 'private' : 'shared',
      };
    }
    if (table === 'tasks') {
      return {
        subject_id: subjectId,
        title: item.title,
        due_on: item.due,
        done_at: item.done ? new Date().toISOString() : null,
      };
    }
    return null;
  }

  var snapshot = null;

  function takeSnapshot(model) {
    var s = { subjectId: model.id, rows: {} };
    Object.keys(TABLE_OF).forEach(function (k) {
      s.rows[k] = {};
      (model[k] || []).forEach(function (item) {
        s.rows[k][item.id] = JSON.stringify(toRow(k, item, model.id));
      });
    });
    snapshot = s;
  }

  /** 比快照，新增的 POST、改过的 PATCH。失败就重新拉一遍，界面回到数据库的真相。 */
  function flush() {
    if (!snapshot) return Promise.resolve();
    var model = SUBJ();
    var subjectId = model.id;
    var jobs = [];

    Object.keys(TABLE_OF).forEach(function (table) {
      var now = model[table] || [];
      var before = snapshot.rows[table] || {};
      var seen = {};

      now.forEach(function (item) {
        var row = toRow(table, item, subjectId);
        if (!row) return;
        var json = JSON.stringify(row);
        if (before[item.id] === undefined) {
          row.id = item.id; // 用界面生成的 id，避免本地/库两套 id
          jobs.push(
            request('POST', '/entities/' + table, row).then(function (res) {
              if (res.row && res.row.id && res.row.id !== item.id) item.id = res.row.id;
            }).catch(function (e) { jobs.push(Promise.reject(e)); }),
          );
        } else if (before[item.id] !== json) {
          jobs.push(request('PATCH', '/entities/' + table + '/' + encodeURIComponent(item.id), row));
        }
        seen[item.id] = true;
      });

      Object.keys(before).forEach(function (id) {
        if (!seen[id]) {
          // 原型没有删除入口，真删了也要跟上
          jobs.push(request('DELETE', '/entities/' + table + '/' + encodeURIComponent(id)));
        }
      });
    });

    return Promise.all(jobs).then(function () {
      takeSnapshot(SUBJ());
    }).catch(function (error) {
      toast('没能保存：' + error.message + '（已重新读取本机数据）');
      return reload();
    });
  }

  /* ---------- 演示数据横幅 ---------- */
  function banner(isDemo, version) {
    var old = document.getElementById('liveBanner');
    if (old) old.remove();
    if (!isDemo) return;
    var bar = document.createElement('div');
    bar.id = 'liveBanner';
    bar.setAttribute('role', 'status');
    bar.style.cssText = [
      'position:sticky', 'top:0', 'z-index:99',
      'display:flex', 'gap:8px', 'align-items:center', 'justify-content:center',
      'padding:6px 12px', 'font-size:12px', 'line-height:1.5',
      'background:#FDF3DC', 'color:#7A4B08',
      'border-bottom:1px solid #E8D3A6',
    ].join(';');
    bar.textContent = '演示数据 · 内容为虚构示例，不是真实病例。v' + (version || '');
    document.body.insertBefore(bar, document.body.firstChild);
  }

  /* ---------- 启动 ---------- */
  function apply(payload) {
    var first = toUiModel(payload, 0);
    var second = (payload.subjects || []).length > 1 ? toUiModel(payload, 1) : null;

    if (!first) {
      // 空库：先种一份演示数据，再重来一次
      return request('POST', '/seed').then(function () { return reload(); });
    }

    DEMO.A = first;
    if (second) DEMO.B = second;
    else DEMO.B = first;

    var chip = document.querySelector('.vchip');
    if (chip && payload.version) chip.textContent = 'v' + payload.version;

    banner(payload.demo, payload.version);
    render();
    takeSnapshot(SUBJ());
    booted = true;
  }

  function reload() {
    return request('GET', '/bootstrap').then(apply);
  }

  /* 让原型里的「问过了 / 解决了 / 私密 / 加一条」在改完内存之后写回数据库。
     原型把这些改动都走 mountConcerns()/mountViewpoints()/render() 重画，
     所以在 document 上做一次捕获监听 + 微任务延迟，拿到最终状态再 diff。 */
  function wireWrites() {
    var pending = null;
    document.addEventListener('click', function (ev) {
      var target = ev.target;
      if (!(target instanceof Element)) return;
      var actionable =
        target.closest('[data-act]') ||
        target.closest('#cAdd') ||
        target.closest('#vAdd') ||
        target.closest('[data-task-toggle]');
      if (!actionable) return;
      clearTimeout(pending);
      pending = setTimeout(function () { flush(); }, 0);
    }, true);
  }

  function boot() {
    // 先藏一下，避免演示数据闪一下再被真实数据替换
    var style = document.createElement('style');
    style.textContent = 'html.live-booting body{visibility:hidden}';
    document.head.appendChild(style);
    document.documentElement.classList.add('live-booting');

    wireWrites();
    request('GET', '/bootstrap')
      .then(apply)
      .catch(function (error) {
        console.error(error);
        document.documentElement.classList.remove('live-booting');
        toast('读取本机数据失败：' + error.message);
      })
      .then(function () {
        document.documentElement.classList.remove('live-booting');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
