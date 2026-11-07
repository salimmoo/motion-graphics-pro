/**
 * MGP.wajah \u2014 ekspresi FACS-lite (Action Unit) + rig kepala 2.5D dari 5 pose ekstrem, digerakkan joystick 2D.
 *
 * FACS-lite: ekspresi tidak lagi satu slider "marah"/"senang", melainkan gabungan Action Unit (otot wajah) 0..1:
 *   AU1 angkat alis dalam, AU2 angkat alis luar, AU4 turunkan/kerutkan alis, AU5 buka kelopak atas,
 *   AU6 angkat pipi (mata menyipit senyum), AU7 kencangkan kelopak, AU12 tarik sudut bibir (senyum),
 *   AU15 tekan sudut bibir (cemberut), AU23 kencangkan bibir, AU26 rahang turun, kedip.
 *   Emosi yang sudah ada di modul lain dipetakan ke AU (EMOSI): netral/normal, senyum/senang, tawa, sedih, kaget,
 *   marah, ragu, kedip, semangat/excited.
 * Gabung dengan lip-sync tanpa bentrok: rahang dipakai bersama. Saat bicara, visem memegang rahang dan bentuk
 *   mulut; AU26 hanya menambah bila lebih lebar dari visem (rahang = max(visem, AU26)). Sudut bibir AU12/AU15 tetap
 *   ditambahkan (senyum sambil bicara), diredam saat visem membulat (O/U).
 * Kepala 2.5D: 5 pose (tengah, kiri, kanan, atas, bawah) berisi geseran per fitur. Joystick (jx, jy) di [-1, 1]^2
 *   mencampur pose: P = T + max(jx,0)(Ka-T) + max(-jx,0)(Ki-T) + max(jy,0)(Ba-T) + max(-jy,0)(At-T).
 *   Pose bawaan dibangkitkan dari kedalaman fitur (paralaks): hidung paling depan bergeser paling jauh, mata dan
 *   mulut sedang, telinga dan rambut belakang bergeser berlawanan.
 *
 * Fungsi murni (MGP.wajah.lib dan langsung di MGP.wajah):
 *   AU (nama), EMOSI {nama: {AU1: .., ...}}, au(namaAtauObjek, kuat=1) -> objek AU lengkap
 *   campurAU(a, b, k), auPada(kunci [[t, nama|AU], ...], t, transisi=0.25) -> AU pada detik t (blend halus)
 *   gabung(au, mulut) -> parameter wajah {alisDalam, alisLuar, kerut, kelopak, pipi, sudut, rahang, lebar, bulat, gigi, kedip}
 *     mulut: hasil MGP.lipsync.at(...) atau {open|openK, wide, round, teeth}; null = diam
 *   POSE_KEPALA, poseKepala(poses, jx, jy) -> pose campuran (objek angka bersarang apa pun)
 *   keVectorKit(au) -> spesifikasi ekspresi untuk MGP.vectorKit (opsi expr), keChibi(au) -> entri faces MGP.chibiObject,
 *   keLipsync(au) -> nilai untuk opsi ekspresi MGP.lipsync (sama dengan au)
 *   gambarWajah(g, F, pose, palet) -> gambar kepala vektor dalam satuan wajah (radius ~100, pusat 0,0)
 *
 * Modul kanvas MGP.wajah.create(target, opsi):
 *   joystick  [0,0] | [[t, [jx, jy]], ...] | (t) => [jx, jy]
 *   ekspresi  "netral" | objek AU | [[t, nama|AU], ...] | (t) => AU     transisi 0.25 s
 *   teks / track   lip-sync (perlu lipsync.js); lead 0.3
 *   pose      pose ekstrem sendiri {tengah, kiri, kanan, atas, bawah}
 *   panel     true: meter AU + nilai joystick di sisi kanan;  palette, bg, duration 8, width 1280, height 720
 *
 * Contoh:
 *   const w = MGP.wajah.create("#stage", { joystick: [[0, [0, 0]], [2, [1, 0]], [4, [-1, -0.5]]],
 *     ekspresi: [[0, "netral"], [2, "senang"], [4, "kaget"]], teks: "Halo, apa kabar?" });
 *   MGP.core.expose(w);
 *   MGP.vectorKit.create("#a", { expr: MGP.wajah.keVectorKit({ AU1: 0.8, AU4: 0.4, AU15: 0.8 }) });
 */
(function (root) {
  "use strict";
  const MGP = (root.MGP = root.MGP || {});
  const C = MGP.core;
  const TAU = Math.PI * 2;
  const { clamp, lerp, smooth01, mix, rgba } = C;

  /* ---------------- Action Unit ---------------- */
  const AU = { AU1: "angkat alis dalam", AU2: "angkat alis luar", AU4: "turunkan alis", AU5: "buka kelopak atas", AU6: "angkat pipi", AU7: "kencangkan kelopak",
    AU12: "tarik sudut bibir", AU15: "tekan sudut bibir", AU23: "kencangkan bibir", AU26: "rahang turun", kedip: "kedip" };
  const KOSONG = () => Object.fromEntries(Object.keys(AU).map((k) => [k, 0]));
  const EMOSI = {
    netral: {},
    senyum: { AU6: 0.5, AU12: 0.8 },
    senang: { AU6: 0.7, AU12: 1, AU26: 0.15 },
    tawa: { AU6: 1, AU12: 1, AU26: 0.55 },
    sedih: { AU1: 0.85, AU4: 0.35, AU15: 0.8, AU7: 0.15 },
    kaget: { AU1: 1, AU2: 1, AU5: 0.9, AU26: 0.7 },
    marah: { AU4: 1, AU5: 0.35, AU7: 0.6, AU23: 0.75, AU15: 0.2 },
    ragu: { AU2: 0.5, AU4: 0.25, AU15: 0.3, AU23: 0.3 },
    kedip: { AU6: 0.5, AU12: 0.7, kedip: 1 },
    takut: { AU1: 0.9, AU2: 0.7, AU4: 0.5, AU5: 0.8, AU26: 0.3, AU15: 0.3 },
    jijik: { AU4: 0.6, AU7: 0.5, AU15: 0.5, AU23: 0.4 },
  };
  EMOSI.normal = EMOSI.netral; EMOSI.semangat = EMOSI.senang; EMOSI.excited = EMOSI.senang; EMOSI.happy = EMOSI.senang;
  // English emotion names (v2.4)
  for (const [en, id] of [["neutral", "netral"], ["smile", "senyum"], ["laugh", "tawa"], ["sad", "sedih"], ["surprised", "kaget"], ["angry", "marah"],
    ["unsure", "ragu"], ["blink", "kedip"], ["wink", "kedip"], ["afraid", "takut"], ["disgust", "jijik"], ["energetic", "senang"]]) Object.defineProperty(EMOSI, en, { value: EMOSI[id], enumerable: false });
  /** objek AU lengkap dari nama emosi atau objek parsial; kuat = skala intensitas */
  function au(x, kuat = 1) {
    const o = KOSONG(), src = typeof x === "string" ? EMOSI[x] || EMOSI.netral : x || {};
    for (const k in src) if (k in o) o[k] = clamp(src[k] * kuat);
    return o;
  }
  const campurAU = (a, b, k) => { const A = au(a), B = au(b), o = {}; for (const n in A) o[n] = lerp(A[n], B[n], k); return o; };
  /** kunci [[t, nama|AU], ...] -> AU pada t; tiap perubahan dicampur halus selama `transisi` detik */
  function auPada(kunci, t, transisi = 0.25) {
    if (!kunci) return au("netral");
    if (typeof kunci === "function") return au(kunci(t));
    if (!Array.isArray(kunci) || !Array.isArray(kunci[0])) return au(kunci);
    let i = 0; while (i + 1 < kunci.length && kunci[i + 1][0] <= t) i++;
    if (i === 0) return au(kunci[0][1]);
    const k = transisi > 0 ? smooth01((t - kunci[i][0]) / transisi) : 1;
    return k >= 1 ? au(kunci[i][1]) : campurAU(kunci[i - 1][1], kunci[i][1], k);
  }

  /** AU + mulut lip-sync -> parameter wajah. Rahang dipakai bersama: max(visem, AU26). */
  function gabung(A, m) {
    A = au(A);
    const vis = m ? clamp(m.openK != null ? m.openK : m.open || 0) : 0, bicara = !!(m && (m.talking || vis > 0.02));
    const bulat = m ? clamp(m.round || 0) : 0, lebarV = m && m.wide != null ? m.wide : 0.8;
    return {
      alisDalam: A.AU1 - A.AU4 * 0.8, alisLuar: A.AU2 - A.AU4 * 0.25 + A.AU1 * 0.15 * (1 - A.AU2),
      kerut: A.AU4, kelopak: clamp(0.8 + 0.4 * A.AU5 - 0.35 * A.AU7 - 0.3 * A.AU6, 0, 1.2), pipi: A.AU6,
      sudut: (A.AU12 - A.AU15) * (1 - 0.6 * bulat), rahang: Math.max(vis, A.AU26), visem: vis, bicara,
      lebar: (bicara ? lebarV / 0.8 : 1) * (1 + 0.22 * A.AU12 - 0.2 * A.AU23) * (1 - 0.35 * bulat), bulat,
      gigi: m ? clamp(m.teeth || 0) : clamp(A.AU12 * 0.8 + A.AU26 * 0.3 - 0.4), tegang: A.AU23, kedip: A.kedip,
    };
  }

  /* ---------------- kepala 2.5D ---------------- */
  // kedalaman fitur (paralaks): + di depan bidang wajah (bergeser searah putaran), - di belakang (berlawanan)
  const DALAM = { hidung: 1, mulut: 0.72, mata: 0.6, alis: 0.58, pipi: 0.5, dagu: 0.35, telinga: -0.75, rambut: -0.25, poni: 0.15 };
  /** pose ekstrem bawaan dari kedalaman: geser (px satuan wajah) + kompres sisi jauh */
  function poseDari(jx, jy) {
    const K = 30, P = {};
    for (const [f, d] of Object.entries(DALAM)) P[f] = { x: d * K * jx, y: d * K * 0.8 * jy };
    P.kepala = { x: 5 * jx, y: 3 * jy, sx: 1 - 0.07 * Math.abs(jx), sy: 1 - 0.05 * Math.abs(jy) };
    P.mataJauh = 0.42 * Math.abs(jx); P.mataDekat = 0.06 * Math.abs(jx); P.arah = Math.sign(jx);
    P.mataY = 1 - 0.18 * Math.abs(jy); P.mulutJauh = 0.3 * Math.abs(jx);
    return P;
  }
  const POSE_KEPALA = { tengah: poseDari(0, 0), kanan: poseDari(1, 0), kiri: poseDari(-1, 0), bawah: poseDari(0, 1), atas: poseDari(0, -1) };
  // kompresi sisi: kiri/kanan punya arah sendiri, jadi disimpan sebagai nilai per sisi
  POSE_KEPALA.kanan.mataKanan = 1 - 0.42; POSE_KEPALA.kanan.mataKiri = 1 + 0.06; POSE_KEPALA.kiri.mataKiri = 1 - 0.42; POSE_KEPALA.kiri.mataKanan = 1 + 0.06;
  POSE_KEPALA.kanan.mulutKanan = 0.7; POSE_KEPALA.kanan.mulutKiri = 1.05; POSE_KEPALA.kiri.mulutKiri = 0.7; POSE_KEPALA.kiri.mulutKanan = 1.05;
  for (const n of ["tengah", "atas", "bawah"]) Object.assign(POSE_KEPALA[n], { mataKanan: 1, mataKiri: 1, mulutKanan: 1, mulutKiri: 1 });
  // English pose names (v2.4); non-enumerable so code that walks the poses sees the 5 originals only
  for (const [en, id] of [["center", "tengah"], ["right", "kanan"], ["left", "kiri"], ["bottom", "bawah"], ["top", "atas"]]) Object.defineProperty(POSE_KEPALA, en, { value: POSE_KEPALA[id], enumerable: false });
  /** campur 5 pose (objek angka bersarang) dengan joystick (jx, jy) di [-1,1] */
  function poseKepala(poses, jx, jy) {
    poses = poses || POSE_KEPALA; jx = clamp(jx, -1, 1); jy = clamp(jy, -1, 1);
    const T = poses.tengah, w = [[poses.kanan, Math.max(0, jx)], [poses.kiri, Math.max(0, -jx)], [poses.bawah, Math.max(0, jy)], [poses.atas, Math.max(0, -jy)]];
    const rek = (t, path) => {
      if (typeof t === "number") { let v = t; for (const [P, k] of w) { if (!k) continue; let q = P; for (const p of path) q = q == null ? undefined : q[p]; if (typeof q === "number") v += (q - t) * k; } return v; }
      if (t && typeof t === "object") { const o = {}; for (const k in t) o[k] = rek(t[k], path.concat(k)); return o; }
      return t;
    };
    return rek(T, []);
  }

  /* ---------------- adaptor ke modul lain ---------------- */
  /** spesifikasi ekspresi MGP.vectorKit (opsi expr = objek) dari AU */
  function keVectorKit(x) {
    const A = au(x);
    const b = [-0.03 * A.AU1 - 0.03 * A.AU2 + 0.025 * A.AU4, 20 * A.AU4 - 16 * A.AU1 * (1 - A.AU2) + 3 * A.AU12 - 4 * A.AU2 * A.AU1];
    const lid = A.kedip > 0.5 ? "wink" : A.AU5 > 0.5 ? "wide" : A.AU6 > 0.75 ? "happy" : A.AU1 > 0.5 && A.AU15 > 0.4 ? "half" : "open";
    let m;
    if (A.AU26 > 0.45 && A.AU12 < 0.5) m = { k: "O", w: 0.1 + 0.02 * A.AU26, h: 0.08 + 0.08 * A.AU26, tg: 1 };
    else if (A.AU12 > 0.5) m = A.AU26 > 0.3 ? { k: "D", w: 0.2 + 0.05 * A.AU12, h: 0.06 + 0.1 * A.AU26, tt: 1, tg: 1 } : { k: "D", w: 0.15 + 0.05 * A.AU12, h: 0.04 + 0.03 * A.AU12, tt: 1 };
    else if (A.AU23 > 0.5 && A.AU4 > 0.5) m = { k: "teeth", w: 0.18, h: 0.05 };
    else m = { k: "line", w: 0.15 - 0.02 * A.AU15 - 0.02 * A.AU23, c: 0.018 * A.AU12 - 0.024 * A.AU15, sk: 0.02 * A.AU2 * (1 - A.AU1) * (A.AU4 > 0.1 ? 1 : 0) };
    return { n: "FACS", b, lid, one: A.AU2 > 0.3 && A.AU1 < 0.2 && A.AU4 > 0.1, m };
  }
  /** entri faces MGP.chibiObject (opsi faces: {nama: MGP.wajah.keChibi(...)}) dari AU */
  function keChibi(x, dasar) {
    const A = au(x), base = dasar || { steam: 1, arm: 18, emo: "", wig: [2, 4] };
    const yi = -22 - 6 * A.AU1 - 4 * A.AU2 + 5 * A.AU4, yo = -22 - 9 * A.AU2 + 5 * A.AU1 * (1 - A.AU2) - 6 * A.AU4;
    const brow = [-31, yo, -24 + A.AU4, (yi + yo) / 2 - 3 - 3 * A.AU2, -16 + A.AU4, yi];
    const ob = A.AU26, lc = lerp(1 / 3, 1, ob);
    const mouth = { hw: 8 + 4 * A.AU12 + A.AU15 - 2 * ob, y: 14 - 3 * A.AU12 + 6 * A.AU15, lo: 4 + 8.7 * A.AU12 - 9.3 * A.AU15 + 6 * ob, lc, up: 4 - 4 * A.AU12 - 9.3 * A.AU15 - 14 * ob, uc: lc, fill: A.AU12 > 0.5 || ob > 0.3 ? 1 : 0 };
    return Object.assign({}, base, { brow, mouth, eye: clamp(1 - 0.45 * A.AU6 + 0.2 * A.AU5 - 0.2 * A.AU7, 0.3, 1.3), sad: A.AU1 > 0.5 && A.AU15 > 0.4 ? 1 : 0, hot: A.AU4 > 0.7 && A.AU23 > 0.5 ? 1 : 0 });
  }

  /* ---------------- gambar kepala vektor (satuan wajah: radius ~100, pusat 0,0, y ke bawah) ---------------- */
  const PAL = { kulit: "#f0bf98", kulitGelap: "#d79a74", rambut: "#2d2230", rambutTerang: "#4a3a4e", mata: "#1f1720", putih: "#fffaf2", iris: "#5a3a26",
    bibir: "#b4545a", mulut: "#4a1a22", gigi: "#fffaf0", lidah: "#d96c6c", pipi: "#ef8f80", tinta: "#2a1a1e", baju: "#3e6a8a", latar: "#efe6d2" };
  function gambarWajah(g, F, P, pal) {
    const K = Object.assign({}, PAL, pal || {}), hk = P.kepala, J = F.rahang;
    const X = (f, x) => x + P[f].x, Y = (f, y) => y + P[f].y;
    g.lineCap = "round"; g.lineJoin = "round";
    // leher + bahu
    g.fillStyle = K.kulitGelap; g.beginPath(); g.moveTo(-30, 70); g.lineTo(30, 70); g.lineTo(34, 150); g.lineTo(-34, 150); g.closePath(); g.fill();
    g.fillStyle = K.baju; g.beginPath(); g.moveTo(-150, 240); g.bezierCurveTo(-140, 160, -80, 135, -32, 132); g.lineTo(32, 132); g.bezierCurveTo(80, 135, 140, 160, 150, 240); g.closePath(); g.fill();
    g.save(); g.translate(hk.x, hk.y); g.scale(hk.sx, hk.sy);
    // rambut belakang + telinga (di belakang wajah)
    g.fillStyle = K.rambut; g.beginPath(); g.ellipse(X("rambut", 0), Y("rambut", -18), 98, 104, 0, 0, TAU); g.fill();
    for (const s of [-1, 1]) { const ex = X("telinga", s * 84), ey = Y("telinga", 6); g.fillStyle = K.kulit; g.beginPath(); g.ellipse(ex, ey, 15, 23, 0, 0, TAU); g.fill(); g.fillStyle = K.kulitGelap; g.beginPath(); g.ellipse(ex + s * 2, ey + 1, 7, 13, 0, 0, TAU); g.fill(); }
    // wajah: dahi = elips, dagu turun bersama rahang
    const dagu = Y("dagu", 102 + J * 16), dx = P.dagu.x;
    const wajah = () => { g.beginPath(); g.moveTo(-86, -10); g.bezierCurveTo(-88, -110, 88, -110, 86, -10); g.bezierCurveTo(86, 50 + J * 6, 50 + dx, dagu - 4, dx, dagu); g.bezierCurveTo(-50 + dx, dagu - 4, -86, 50 + J * 6, -86, -10); g.closePath(); };
    wajah(); g.fillStyle = K.kulit; g.fill();
    g.save(); wajah(); g.clip();
    // bayangan sisi jauh (memberi kesan volume saat menoleh)
    if (Math.abs(P.arah) > 0) { const sh = g.createLinearGradient(-90 * P.arah, 0, 90 * P.arah, 0); sh.addColorStop(0, rgba(K.kulitGelap, 0)); sh.addColorStop(0.65, rgba(K.kulitGelap, 0)); sh.addColorStop(1, rgba(K.kulitGelap, 0.55 * Math.min(1, P.mataJauh / 0.42))); g.fillStyle = sh; g.fillRect(-110, -120, 220, 260); }
    // pipi (AU6 mengangkat dan memerahkan)
    for (const s of [-1, 1]) { g.fillStyle = rgba(K.pipi, 0.22 + 0.3 * F.pipi); g.beginPath(); g.ellipse(X("pipi", s * 50), Y("pipi", 34 - 7 * F.pipi), 17 * (s > 0 ? P.mataKanan : P.mataKiri), 10, 0, 0, TAU); g.fill(); }
    // mata
    for (const s of [-1, 1]) {
      const kx = s > 0 ? P.mataKanan : P.mataKiri, ex = X("mata", s * 34), ey = Y("mata", -6), rx = 13 * kx, ryF = 15 * P.mataY;
      const buka = F.kedip > 0.5 ? 0.06 : clamp(F.kelopak, 0.06, 1.2), up = ryF * buka * 1.25, lo = ryF * (0.75 - 0.45 * F.pipi);
      g.save(); g.beginPath(); g.ellipse(ex, ey, rx, Math.max(1, (up + lo) / 2), 0, 0, TAU); g.clip();
      g.fillStyle = K.putih; g.fillRect(ex - rx - 2, ey - 30, rx * 2 + 4, 60);
      const px = ex + P.mata.x * 0.25, py = ey + P.mata.y * 0.2;
      g.fillStyle = K.iris; g.beginPath(); g.arc(px, py, 8 * Math.min(1, kx + 0.15), 0, TAU); g.fill();
      g.fillStyle = K.mata; g.beginPath(); g.arc(px, py, 4.2 * Math.min(1, kx + 0.2), 0, TAU); g.fill();
      g.fillStyle = "#fff"; g.beginPath(); g.arc(px + 2.6, py - 2.8, 2, 0, TAU); g.fill();
      g.restore();
      g.strokeStyle = K.tinta; g.lineWidth = 3; g.beginPath(); g.ellipse(ex, ey, rx, Math.max(1, (up + lo) / 2), 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      if (F.kedip > 0.5) { g.beginPath(); g.moveTo(ex - rx, ey); g.quadraticCurveTo(ex, ey + 6, ex + rx, ey); g.stroke(); }
    }
    // alis: AU1 angkat ujung dalam, AU2 ujung luar, AU4 turun + merapat
    for (const s of [-1, 1]) {
      const kx = s > 0 ? P.mataKanan : P.mataKiri, inX = X("alis", s * (14 + 4 * F.kerut)), outX = X("alis", s * (14 + 36 * kx)), y0 = Y("alis", -36);
      const yi = y0 - 12 * F.alisDalam, yo = y0 - 11 * F.alisLuar;
      g.strokeStyle = K.rambut; g.lineWidth = 7; g.beginPath(); g.moveTo(inX, yi); g.quadraticCurveTo((inX + outX) / 2, Math.min(yi, yo) - 5, outX, yo + 3); g.stroke();
      if (F.kerut > 0.3 && s > 0) { g.strokeStyle = rgba(K.kulitGelap, F.kerut * 0.7); g.lineWidth = 2; g.beginPath(); g.moveTo(X("alis", -4), y0 - 6); g.lineTo(X("alis", -3), y0 + 4); g.moveTo(X("alis", 4), y0 - 6); g.lineTo(X("alis", 3), y0 + 4); g.stroke(); }
    }
    // hidung (paling depan)
    g.strokeStyle = K.kulitGelap; g.lineWidth = 3.5; g.beginPath(); const nx = X("hidung", 0), ny = Y("hidung", 18), nd = -6 * (P.arah || 0) - 3;
    g.moveTo(nx + 1, ny - 22); g.quadraticCurveTo(nx + nd, ny, nx - 4, ny + 4); g.quadraticCurveTo(nx + 2, ny + 8, nx + 8, ny + 3); g.stroke();
    // mulut: lebar dari AU12/AU23 dan visem; sudut naik/turun; bukaan = rahang
    const mx = X("mulut", 0), my = Y("mulut", 52 + J * 7), hwR = 22 * F.lebar * P.mulutKanan, hwL = 22 * F.lebar * P.mulutKiri, cy = -9 * F.sudut, op = 26 * J * (1 - 0.2 * F.tegang);
    const atas = (ctx) => { ctx.moveTo(mx - hwL, my + cy); ctx.quadraticCurveTo(mx, my - 4 - op * 0.12 - 2 * F.sudut, mx + hwR, my + cy); };
    const bawah = (ctx) => { ctx.quadraticCurveTo(mx + (hwR - hwL) * 0.1, my + op + 6 * Math.max(0, F.sudut) + 2, mx - hwL, my + cy); };
    if (op > 1.2 || (F.sudut > 0.45 && F.gigi > 0.2)) {
      g.beginPath(); atas(g); bawah(g); g.closePath(); g.fillStyle = K.mulut; g.fill();
      g.save(); g.beginPath(); atas(g); bawah(g); g.closePath(); g.clip();
      if (F.gigi > 0.05) { g.fillStyle = K.gigi; g.fillRect(mx - 30, my - 12, 60, 8 + 6 * F.gigi); }
      if (op > 6) { g.fillStyle = K.lidah; g.beginPath(); g.ellipse(mx, my + op * 0.9, 12 * F.lebar, 7, 0, 0, TAU); g.fill(); }
      g.restore();
      g.strokeStyle = K.bibir; g.lineWidth = 3; g.beginPath(); atas(g); bawah(g); g.closePath(); g.stroke();
    } else { g.strokeStyle = K.bibir; g.lineWidth = 4.5 + 2 * F.tegang; g.beginPath(); atas(g); g.stroke(); }
    g.restore();
    // poni (sedikit di depan dahi)
    g.fillStyle = K.rambut; g.beginPath(); const px = P.poni.x, py = P.poni.y;
    g.moveTo(-90, -20); g.bezierCurveTo(-96 + px, -120 + py, 96 + px, -128 + py, 92, -26); g.bezierCurveTo(78, -66 + py, 40 + px, -72 + py, 10 + px, -58 + py); g.bezierCurveTo(-20 + px, -78 + py, -62 + px, -70 + py, -90, -20); g.closePath(); g.fill();
    g.strokeStyle = K.rambutTerang; g.lineWidth = 3; g.beginPath(); g.moveTo(-40 + px, -92 + py); g.quadraticCurveTo(-10 + px, -100 + py, 20 + px, -90 + py); g.stroke();
    g.restore();
  }

  /* ---------------- modul ---------------- */
  const joyAt = (j, t) => {
    if (typeof j === "function") return j(t);
    if (!Array.isArray(j)) return [0, 0];
    if (typeof j[0] === "number") return j;
    const kx = j.map((k) => [k[0], k[1][0]]), ky = j.map((k) => [k[0], k[1][1]]);
    return [C.key(kx, t), C.key(ky, t)];
  };
  const api = C.defineModule("wajah", {   // internal name kept (default rng seed)
    aliases: { expression: "ekspresi", transition: "transisi", text: "teks", scale: "skala" },
    size: [1280, 720],
    duration: (o) => o.duration || 8,
    defaults: { joystick: [0, 0], ekspresi: "netral", transisi: 0.25, teks: null, track: null, lead: 0.3, pose: null, panel: true, palette: null, bg: "#efe6d2", skala: 1, duration: 8,
      font: "ui-monospace, Menlo, Consolas, monospace" },
    setup(S) {
      const o = S.opts; S.K = Object.assign({}, PAL, o.palette || {});
      S.track = MGP.lipsync && (o.teks || o.track) ? (o.track ? o.track : MGP.lipsync.visemes(o.teks)) : null;
    },
    render(g, t, S) {
      const o = S.opts, W = S.W, H = S.H;
      if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, W, H); }
      const [jx, jy] = joyAt(o.joystick, t), A = auPada(o.ekspresi, t, o.transisi);
      // kedip otomatis tiap 3,1 s (0,12 s), kecuali ekspresi sudah memegang kedip
      const bl = ((t % 3.1) + 3.1) % 3.1 < 0.12 ? 1 : 0; A.kedip = Math.max(A.kedip, bl);
      const m = S.track ? MGP.lipsync.at(S.track, t - o.lead) : null;
      const F = gabung(A, m), P = poseKepala(o.pose || POSE_KEPALA, jx, jy);
      const cx = o.panel ? W * 0.36 : W / 2, s = Math.min(W, H) / 430 * o.skala;
      g.save(); g.translate(cx, H * 0.47); g.scale(s, s); gambarWajah(g, F, P, S.K); g.restore();
      if (o.panel) {
        const x0 = W * 0.7, fs = Math.max(12, Math.round(H / 40)), rh = fs * 1.55; let y = H * 0.12;
        g.font = `600 ${fs}px ${o.font}`; g.textBaseline = "middle"; g.fillStyle = "#3a2c1e"; g.textAlign = "left";
        g.fillText(`joystick ${jx.toFixed(2)}, ${jy.toFixed(2)}`, x0, y); y += rh;
        g.fillText(`rahang ${F.rahang.toFixed(2)} (visem ${F.visem.toFixed(2)})`, x0, y); y += rh * 1.2;
        for (const k of ["AU1", "AU2", "AU4", "AU5", "AU6", "AU7", "AU12", "AU15", "AU23", "AU26"]) {
          g.fillStyle = "#3a2c1e"; g.fillText(k, x0, y); g.fillStyle = "rgba(58,44,30,.15)"; g.fillRect(x0 + fs * 3.6, y - fs * 0.35, W * 0.2, fs * 0.7);
          g.fillStyle = "#c8724e"; g.fillRect(x0 + fs * 3.6, y - fs * 0.35, W * 0.2 * A[k], fs * 0.7); y += rh;
        }
      }
      S.kurva = { jx, jy, rahang: F.rahang, AU12: A.AU12, AU26: A.AU26 };
    },
  });
  Object.assign(api, { AU, EMOSI, au, campurAU, auPada, gabung, POSE_KEPALA, poseKepala, keVectorKit, keChibi, keLipsync: au, gambarWajah,
    EMOTION: EMOSI, POSE_HEAD: POSE_KEPALA, mixAU: campurAU, auAt: auPada, merge: gabung, poseHead: poseKepala,
    toVectorKit: keVectorKit, toChibi: keChibi, toLipsync: au, drawFace: gambarWajah });
  api.lib = { AU, EMOSI, DALAM, PAL, au, campurAU, auPada, gabung, POSE_KEPALA, poseDari, poseKepala, keVectorKit, keChibi, gambarWajah, joyAt };
  MGP.face = MGP.wajah = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
