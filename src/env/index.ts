import {config} from "dotenv";
import {z} from "zod";

//process.env
if(process.env.NODE_ENV === "test"){
	config({path: ".env.test"});
}else{
	config();
}

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
	DATABASE_URL: z.string(),
	PORT: z.number().default(3333),

});

const tryEnv = envSchema.safeParse(process.env);
if(!tryEnv.success){
	throw new Error(tryEnv.error.message );
}

export const env = tryEnv.data;