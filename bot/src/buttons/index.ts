import { Telegraf } from "telegraf";
import { uploadPhotoMenu } from "./uploadPhotoMenu.js";
import { uploadMorePhoto } from "./uploadMorePhoto.js";
import { backToMainMenu } from "./backToMainMenu.js";
import { handlePhotoUpload } from "./handlePhotoUpload.js";
import { finishUpload } from "./finishUpload.js";
import { handleAdClick } from "./handleAdClick.js";

export function registerButtons(bot: Telegraf) {
  uploadPhotoMenu(bot);
  uploadMorePhoto(bot);
  backToMainMenu(bot);
  handlePhotoUpload(bot);
  finishUpload(bot);
  handleAdClick(bot);
} 