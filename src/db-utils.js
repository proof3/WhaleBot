import sqlite3 from "sqlite3";
import {
    DB_LOCATION,
    CREATE_USER_WEIGHTS_TABLE,
    INSERT_USER_WEIGHTS_TABLE,
    SELECT_CURRENT_WEEK,
    SELECT_LAST_WEEK,
    FILE_SIZE_ERR_MSG
} from "./constants.js";
import fs from "fs";

const sqlite = sqlite3.verbose();

export function initDb() {
    const db = new sqlite.Database(DB_LOCATION);
    db.serialize(() => {
        db.run(CREATE_USER_WEIGHTS_TABLE);
        db.close();
    });
}

export function recordWeight(username, weight) {
    const db = new sqlite.Database(DB_LOCATION);
    db.serialize(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = (now.getMonth() + 1) < 10 ? "0" + (now.getMonth() + 1) : (now.getMonth() + 1);
        const d = now.getDate() < 10 ? "0" + now.getDate() : now.getDate();
        const dateStr = `${y}${m}${d}`;
        const primaryKey = `${dateStr}-${username}`;

        const stmt = db.prepare(INSERT_USER_WEIGHTS_TABLE);

        stmt.run(primaryKey, dateStr, username, Number.parseFloat(weight));
        stmt.finalize();
        db.close();
    });
}

export async function weightStats(username) {
    return new Promise(async (res) => {
        const db = new sqlite.Database(DB_LOCATION);
        db.serialize(async () => {
            const data = {
                currWeights: [],
                pastWeights: [],
            };

            const currWeekPromise = new Promise((resCurrWeek) => {
                db.all(SELECT_CURRENT_WEEK, username, (err, rows) => {
                    data['currWeights'] = rows.map((row) => row.weight);
                    resCurrWeek();
                });
            });

            const lastWeekPromise = new Promise((resLastWeek) => {
                db.all(SELECT_LAST_WEEK, username, (err, rows) => {
                    data['pastWeights'] = rows.map((row) => row.weight);
                    resLastWeek();
                });
            });

            await Promise.all([currWeekPromise, lastWeekPromise]);

            db.close();
            res(data);
        });
    });
}

export function dumpDB() {
    //check file size
    const size = fs.statSync(DB_LOCATION).size / (1024*1024);
    if (size <= 8) {

        const data = fs.readFileSync(DB_LOCATION, {encoding:'utf8', flag:'r'});
        return {content: "DB File", file: {file: data, name:'WhaleBot.db'}};
    }

    return FILE_SIZE_ERR_MSG;
}