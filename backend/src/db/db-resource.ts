import { join } from "path"
import { DataSource } from "typeorm"

export const myDataSource = new DataSource({
    type: "mysql",
    host: "db",
    port: 3306,
    username: "root",
    password: "Jingn63z93!",
    database: "ta-webrtc",
    entities: [join(__dirname, "../","**", "*.entities.{js,ts}" )],
    logging: false,
    synchronize: true,
})