import { createPairHandler, redisStore } from "../server/pairing.js";
export default createPairHandler(redisStore);
