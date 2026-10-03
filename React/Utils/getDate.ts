import { DATE_LANGUAGE } from "src/Types/Enums";

const getDate = (language: DATE_LANGUAGE = DATE_LANGUAGE.FRENCH): string => {
	return new Date().toLocaleDateString(language, {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric",
	});
};

export default getDate;
