import { createSchoolHandler } from "../server/school.js";
import { redisStore } from "../server/pairing.js";
export default createSchoolHandler(redisStore);
