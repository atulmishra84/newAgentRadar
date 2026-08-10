'use strict';

const crypto = require('crypto');
const { XMLParser } = require('fast-xml-parser');
const config = require('../config');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

function spEntityId() {
  return process.env.SAML_ENTITY_ID || `${config.appUrl.replace(/\/$/, '')}/saml/metadata`;
}

function resolveAcsUrl() {
  if (process.env.SAML_ACS_URL) return process.env.SAML_ACS_URL;
  // ACS must hit the API, not the Vite dev server
  return `http://localhost:${config.port}/api/auth/saml/acs`;
}

function metadataXml() {
  const entityId = spEntityId();
  const acs = resolveAcsUrl();
  return `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${entityId}">
  <SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="false"
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acs}" index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;
}

function buildAuthnRequest(idpSsoUrl) {
  const id = `_${crypto.randomBytes(16).toString('hex')}`;
  const issueInstant = new Date().toISOString();
  const xml = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}" Version="2.0" IssueInstant="${issueInstant}"
    Destination="${idpSsoUrl}"
    AssertionConsumerServiceURL="${resolveAcsUrl()}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>${spEntityId()}</saml:Issuer>
    <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
  </samlp:AuthnRequest>`;
  const encoded = Buffer.from(xml, 'utf8').toString('base64');
  const url = new URL(idpSsoUrl);
  url.searchParams.set('SAMLRequest', encoded);
  return { id, redirectUrl: url.toString(), xml };
}

function first(val) {
  if (Array.isArray(val)) return val[0];
  return val;
}

function collectAttrs(assertion) {
  const attrs = {};
  const attrStmt = assertion?.AttributeStatement;
  const list = attrStmt?.Attribute
    ? Array.isArray(attrStmt.Attribute)
      ? attrStmt.Attribute
      : [attrStmt.Attribute]
    : [];
  for (const a of list) {
    const name = a['@_Name'] || a['@_FriendlyName'];
    let v = a.AttributeValue;
    if (Array.isArray(v)) v = v.map((x) => (typeof x === 'object' ? x['#text'] || x : x));
    else if (v && typeof v === 'object') v = v['#text'] || v;
    if (name) attrs[name] = v;
  }
  return attrs;
}

function parseSamlResponse(b64) {
  const xml = Buffer.from(String(b64 || ''), 'base64').toString('utf8');
  // Local/dev JSON assertion for tests without IdP
  try {
    const demo = JSON.parse(xml);
    if (demo.email) {
      return {
        email: demo.email,
        name: demo.name || demo.email,
        attrs: { roles: demo.roles || [], ...(demo.attrs || {}) },
        demo: true,
      };
    }
  } catch {
    /* not JSON */
  }

  if (!xml.includes('Assertion') && !xml.includes('Response')) {
    throw new Error('Invalid SAMLResponse');
  }
  const doc = parser.parse(xml);
  const response = doc.Response || doc;
  const assertion = first(response.Assertion);
  if (!assertion) throw new Error('SAML assertion missing');

  const subject = assertion.Subject?.NameID;
  const attrs = collectAttrs(assertion);
  const email =
    (typeof subject === 'object' ? subject['#text'] || subject : subject) ||
    attrs.email ||
    attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
  const name =
    attrs.displayName ||
    attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
    email;
  const roles =
    attrs.roles ||
    attrs.Groups ||
    attrs.groups ||
    attrs['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    [];
  return {
    email: String(email || '').trim(),
    name: String(name || email || '').trim(),
    attrs: {
      ...attrs,
      roles: Array.isArray(roles) ? roles : [roles].filter(Boolean),
    },
  };
}

module.exports = {
  metadataXml,
  buildAuthnRequest,
  parseSamlResponse,
  spEntityId,
  resolveAcsUrl,
};
