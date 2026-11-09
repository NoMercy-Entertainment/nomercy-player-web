// -----------------------------------------------------------------------------
//  Copyright (c) NoMercy Entertainment
//
//  Licensed under the Apache License, Version 2.0. See LICENSE for details.
//
//  SPDX-License-Identifier: Apache-2.0
// -----------------------------------------------------------------------------

const GQL_URL = 'https://gql.twitch.tv/gql';
const WEB_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

/** Sends a POST and decodes the JSON answer. The plugin supplies one that sends no player auth. */
export type PostJson = <Body>(url: string, options: {
  method: 'POST';
  headers: Record<string, string>;
  body: string;
}) => Promise<Body>;

/** Sends one query to Twitch's web API through `post`. A media server's token must never reach Twitch. */
export async function postGql<Data>(post: PostJson, query: string, variables: object, clientId: string = WEB_CLIENT_ID): Promise<Data | undefined> {
  const { data } = await post<{ data?: Data }>(GQL_URL, {
    method: 'POST',
    headers: { 'Client-Id': clientId },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  return data;
}
