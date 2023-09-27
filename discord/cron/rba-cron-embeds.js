/**
 * @fileoverview This file contains the functions that generate the embeds for the
 * rare bird alert functionality.
 */

import { EmbedBuilder } from 'discord.js';

/**
 * @typedef {Object} GroupedObservation
 * @property {string} speciesCode - The species code of the observation
 * @property {string} comName - The common name of the observation
 * @property {string} locId - The location ID of the observation
 * @property {string} locName - The location name of the observation
 * @property {string} subId - The submission ID of the observation
 * @property {string} subnational2Name - The county name of the observation
 * @property {string} obsDt - The date of the observation
 * @property {number} howMany - The number of birds seen
 * @property {boolean} obsReviewed - Whether the observation was reviewed
 * @property {boolean} locationPrivate - Whether the location was private
 * @property {Array.<string>} evidence - The evidence of the observation
 */

/**
 * Generates a description for a grouped observation.
 * @param {GroupedObservation} observation
 * @returns
 */
function generateDescription(observation) {
  const aOrAn = observation.comName[0].match('^[aieouAIEOU].*') ? 'An' : 'A';
  const confirmedStatusIcon = observation.obsReviewed
    ? ':white_check_mark:'
    : ':grey_question:';
  let description = `${aOrAn} ${observation.comName} was`;
  if (observation.howMany > 1) {
    description = `${observation.howMany} ${observation.comName} were`;
  }
  description += ` seen at ${observation.locName}${
    observation.locationPrivate ? '' : ' (Hotspot)'
  }${confirmedStatusIcon}x${observation.obsCount}`;
  description += `\n${observation.subnational2Name} County`;
  description += `\n${observation.obsDt}`;
  return description;
}

/**
 * Generates an embed for a grouped observation.
 * @param {GroupedObservation} observation
 * @returns
 */
function generateEmbed(observation) {
  const description = generateDescription(observation);
  const builder = new EmbedBuilder()
    .setColor(0x3671aa)
    .setTitle(observation.comName)
    .setURL(`https://ebird.org/checklist/${observation.subId}`)
    .setDescription(description);
  return builder;
}

export function generateEmbeds(groupedObservations) {
  const observationsToSend = [];
  groupedObservations.forEach((observation) => {
    const embed = generateEmbed(observation);
    console.log('Successfully generated embed for', observation.comName);
    observationsToSend.push(embed);
  });
  return observationsToSend;
}

/**
 *
 * @param {Client.<boolean>} client
 * @param {Array.<EmbedBuilder>} observations
 * @param {Array.<string>} channels
 */
export async function sendEmbeds(client, embeds, channels) {
  channels.forEach((channelId) => {
    try {
      const channel = client.channels.cache.get(channelId);
      embeds.forEach((embed) => {
        setTimeout(() => {
          try {
            channel.send({ embeds: [embed] });
          } catch (err) {
            console.log('Likely missing permissions', err);
          }
        }, 500);
      });
    } catch (err) {
      console.log(err);
    }
  });
}
