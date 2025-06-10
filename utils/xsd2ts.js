// import {generateTemplateClassesFromXSD} from "xsd2ts";
const { fs } = require("fs");
const path = require("path");
const { generateTemplateClassesFromXSD } = require("xsd2ts");
const xsd_path=path.resolve(__dirname,"..","OSA","xsd");
generateTemplateClassesFromXSD(path.join(xsd_path,"invoiceApi.xsd"));
generateTemplateClassesFromXSD(path.join(xsd_path,"common.xsd"), {common: './common.xsd'});
generateTemplateClassesFromXSD(path.join(xsd_path,"invoiceBase.xsd"), {base: './invoiceBase.xsd'});


