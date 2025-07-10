import { Telegraf } from "telegraf";
import { startCommand } from "./start";
import { resetCommand } from "./reset";
import { notifyFixCommand } from "./notifyfix";
import { testAdsCommand } from "./testads";
import { broadcastAdsCommand } from "./broadcastads";
import { checkCampaignsCommand } from "./checkcampaigns";
import { approveAllCommand } from "./approveall";

export function registerCommands(bot: Telegraf) {
  startCommand(bot);
  resetCommand(bot);
  notifyFixCommand(bot);
  testAdsCommand(bot);
  broadcastAdsCommand(bot);
  checkCampaignsCommand(bot);
  approveAllCommand(bot);
} 