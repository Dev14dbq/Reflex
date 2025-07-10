import { Telegraf } from "telegraf";
import { uploadPhotoMenu } from "./uploadPhotoMenu";
import { uploadMorePhoto } from "./uploadMorePhoto";
import { backToMainMenu } from "./backToMainMenu";
import { supportMenu } from "./supportMenu";
import { handlePhotoUpload } from "./handlePhotoUpload";
import { finishUpload } from "./finishUpload";
import { handleAdClick } from "./handleAdClick";

export function registerButtons(bot: Telegraf) {
  uploadPhotoMenu(bot);
  uploadMorePhoto(bot);
  backToMainMenu(bot);
  supportMenu(bot);
  handlePhotoUpload(bot);
  finishUpload(bot);
  handleAdClick(bot);
} 