const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config();

const DEF_PW = "ypwi123";

const migrateTeachers = async () => {
    console.log("=".repeat(60));
    console.log("MIGRASI DATA TEACHER (YPWI) - FINAL FIX");
    console.log("=".repeat(60));

    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10
    });

    let conn = null;
    let ok = 0, sk = 0, er = 0;

    try {
        conn = await pool.getConnection();
        const [rows] = await conn.query("SELECT * FROM temp_teachers");
        
        if (!rows || rows.length === 0) {
            console.log("❌ Tidak ada data di temp_teachers.");
            return;
        }

        const hp = await bcrypt.hash(DEF_PW, 10);

        // Mapping Nama Sekolah ke Tenant ID Singkatan
        const schoolMapping = {
            'TKIT WAHDAH ISLAMIYAH 01 TOMONI': 'TKITWI01',
            'TKIT WAHDAH ISLAMIYAH 02 MALILI': 'TKITWI02',
            'TKIT WAHDAH ISLAMIYAH 03 WASUPONDA': 'TKITWI03',
            'TKIT WAHDAH ISLAMIYAH 04 KALAENA': 'TKITWI04',
            'TKIT WAHDAH ISLAMIYAH 05 BURAU': 'TKITWI05',
            'TKIT WAHDAH ISLAMIYAH 06 WOTU': 'TKITWI06',
            'TKIT WAHDAH ISLAMIYAH 07 MANGKUTANA': 'TKITWI07',
            'TKIT WAHDAH ISLAMIYAH 08 TOWUTI': 'TKITWI08',
            'TKIT RABBANI SOROWAKO': 'TKITRABBANI',
            'SDIT INSAN RABBANI': 'SDITIR',
            'SDIT QURANI WAHDAH ISLAMIYAH 03 SOROWAKO': 'SDITWI03',
            'SDIT WAHDAH ISLAMIYAH 02 TOMONI': 'SDITWI02',
            'SDIT WAHDAH ISLAMIYAH 04 BURAU': 'SDITWI04',
            'SDIT WAHDAH ISLAMIYAH 05 KALAENA': 'SDITWI05',
            'SDIT WAHDAH ISLAMIYAH 06 WASUPONDA': 'SDITWI06',
            'SDIT WAHDAH ISLAMIYAH 07 WOTU': 'SDITWI07',
            'SDIT WAHDAH ISLAMIYAH 08 TOWUTI': 'SDITWI08',
            'SDIT WAHDAH ISLAMIYAH 09 MANGKUTANA': 'SDITWI09',
            'SMPIT WAHDAH ISLAMIYAH 01 MALILI': 'SMPITWI01',
            'SMPIT WAHDAH ISLAMIYAH 02 KALAENA': 'SMPITWI02',
            'SMAIT WAHDAH ISLAMIYAH 01 TOMONI': 'SMAITWI01',
            'PONDOK PESANTREN INFORMATIKA DAN BAHASA WAHDAH ISLAMIYAH': 'PONDOKWI',
            'PPTQ Malili': 'PPTQMALILI',
            'PPTQ SALMAN ALFARISI PUTRA': 'PPTQSAF',
            'PPTQ Sorowako': 'PPTQSOROWAKO',
            'YPWI LUWU TIMUR': 'YPWILUTIM'
        };

        for (const r of rows) {
            try {
                await conn.beginTransaction();

                // Ambil tenant_id asli dari mapping, jika tidak ada pakai aslinya
                const rawSchoolName = r.tenant_id ? r.tenant_id.trim() : "YPWI LUWU TIMUR";
                const mappedID = schoolMapping[rawSchoolName] || rawSchoolName;

                // 1. Pastikan Tenant ada dengan ID Singkatan
                await conn.query(
                    "INSERT IGNORE INTO tenants (tenant_id, nama_sekolah, absensi_method) VALUES (?, ?, 'gateway')",
                    [mappedID, rawSchoolName]
                );

                const nikClean = r.NIK || ("NIK-" + Math.floor(Math.random() * 1000000));

                // 2. Cek/Insert Teacher
                const [existing] = await conn.query("SELECT id FROM teachers WHERE nik = ?", [nikClean]);
                let tid;

                if (existing.length > 0) {
                    tid = existing[0].id;
                } else {
                    let nipFinal = r.NIY || r.NIP || ("BELUM-" + Math.floor(100000 + Math.random() * 900000));
                    
                    const [res] = await conn.query(
                        `INSERT INTO teachers(nama, nik, tempat_lahir, tanggal_lahir, jenis_kelamin, alamat, no_wa, email, status_kepegawaian, tmt, nip, link_foto, status_aktif)
                         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
                        [
                            r.Nama, nikClean, r.Tempat_Lahir, r.Tanggal_Lahir,
                            r.Jenis_Kelamin === 'Laki-laki' || r.Jenis_Kelamin === 'L' ? 'L' : 'P',
                            r.Alamat, r.No_WA, r.Email, r.Status_Kepegawaian,
                            r.TMT, nipFinal, r.Link_Foto
                        ]
                    );
                    tid = res.insertId;

                    // 3. User Account (Gunakan email & mappedID unit pertama)
                    if (r.Email && r.Email.includes('@')) {
                        await conn.query(
                            "INSERT IGNORE INTO users(username, password, role, guru_id, tenant_id, is_profile_complete, is_default_password) VALUES(?,?,'guru',?,?,1,1)",
                            [r.Email.trim(), hp, tid, mappedID]
                        );
                        ok++;
                    } else {
                        sk++;
                    }
                }

                // 4. Assignment menggunakan ID Singkatan
                await conn.query(
                    "INSERT IGNORE INTO teacher_assignments(teacher_id, tenant_id, jabatan_di_unit) VALUES(?,?,?)",
                    [tid, mappedID, r.Jabatan]
                );

                await conn.commit();
            } catch (e) {
                if (conn) await conn.rollback();
                console.error(`[ERROR] ${r.Nama}: ${e.message}`);
                er++;
            }
        }

        console.log("\n" + "-".repeat(30));
        console.log(`✅ BERHASIL : ${ok + sk}`);
        console.log(`🟡 GURU TANPA EMAIL: ${sk} (User account tidak dibuat)`);
        console.log(`❌ ERROR    : ${er}`);
        console.log("-".repeat(30));

    } catch (e) {
        console.error("CRITICAL ERROR:", e.message);
    } finally {
        if (conn) conn.release();
        await pool.end();
        process.exit();
    }
};

migrateTeachers();