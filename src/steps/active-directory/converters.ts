import map from 'lodash.map';

import {
  convertProperties,
  createIntegrationEntity,
  createDirectRelationship,
  Entity,
  getTime,
  IntegrationInstance,
  Relationship,
  assignTags,
  setRawData,
} from '@jupiterone/integration-sdk-core';
import { Group, Organization, User } from '@microsoft/microsoft-graph-types';

import { generateEntityKey } from '../../utils/generateKeys';
import {
  IdentitySecurityDefaultsEnforcementPolicy,
  CredentialUserRegistrationDetails,
} from './client';
import {
  ACCOUNT_ENTITY_CLASS,
  ACCOUNT_ENTITY_TYPE,
  ACCOUNT_GROUP_RELATIONSHIP_TYPE,
  GROUP_ENTITY_CLASS,
  GROUP_ENTITY_TYPE,
  USER_ENTITY_CLASS,
  USER_ENTITY_TYPE,
  SERVICE_PRINCIPAL_ENTITY_CLASS,
  SERVICE_PRINCIPAL_ENTITY_TYPE,
} from './constants';
import { RelationshipClass } from '@jupiterone/integration-sdk-core';

export function createAccountEntity(instance: IntegrationInstance): Entity {
  return createIntegrationEntity({
    entityData: {
      source: {},
      assign: {
        _class: ACCOUNT_ENTITY_CLASS,
        _key: generateEntityKey(instance.id),
        _type: ACCOUNT_ENTITY_TYPE,
        name: instance.name,
        displayName: instance.name,
      },
    },
  });
}

export function createAccountEntityWithOrganization(
  instance: IntegrationInstance,
  organization: Organization,
  securityDefaults?: IdentitySecurityDefaultsEnforcementPolicy,
): Entity {
  let defaultDomain: string | undefined;
  const verifiedDomains = map(organization.verifiedDomains, (e) => {
    if (e.isDefault) {
      defaultDomain = e.name;
    }
    return e.name as string;
  });

  const accountEntityWithOrganization = createIntegrationEntity({
    entityData: {
      source: organization,
      assign: {
        _class: ACCOUNT_ENTITY_CLASS,
        _key: generateEntityKey(instance.id),
        _type: ACCOUNT_ENTITY_TYPE,
        name: organization.displayName,
        displayName: instance.name,
        organizationName: organization.displayName,
        defaultDomain,
        verifiedDomains,
        securityDefaultsEnabled: securityDefaults?.isEnabled,
      },
    },
  });

  if (securityDefaults) {
    setRawData(accountEntityWithOrganization, {
      name: 'identitySecurityDefaultsEnforcementPolicy',
      rawData: securityDefaults,
    });
  }
  return accountEntityWithOrganization;
}

export function createGroupEntity(data: Group): Entity {
  return createIntegrationEntity({
    entityData: {
      source: data,
      assign: {
        ...convertProperties(data, { parseTime: true }),
        _key: generateEntityKey(data.id),
        _class: GROUP_ENTITY_CLASS,
        _type: GROUP_ENTITY_TYPE,
        name: data.displayName,
        deletedOn: getTime(data.deletedDateTime),
        createdOn: getTime(data.createdDateTime),
        email: data.mail ?? undefined,
        renewedOn: getTime(data.renewedDateTime),
      },
    },
  });
}

export function createUserEntity(
  data: User,
  registrationDetails?: CredentialUserRegistrationDetails,
): Entity {
  const userEntity = createIntegrationEntity({
    entityData: {
      source: data,
      assign: {
        ...convertProperties(data),
        _key: generateEntityKey(data.id),
        _class: USER_ENTITY_CLASS,
        _type: USER_ENTITY_TYPE,
        name: data.displayName,
        active: data.accountEnabled,
        email: data.mail ?? undefined,
        firstName: data.givenName || data.displayName?.split(' ')[0],
        lastName: data.surname || data.displayName?.split(' ').slice(-1)[0],
        username: data.userPrincipalName,
        isMfaRegistered: registrationDetails?.isMfaRegistered,
        accountEnabled: data.accountEnabled,
      },
    },
  });

  if (registrationDetails) {
    setRawData(userEntity, {
      name: 'registrationDetails',
      rawData: registrationDetails,
    });
  }

  return userEntity;
}

export function createServicePrincipalEntity(data: any): Entity {
  const entity = createIntegrationEntity({
    entityData: {
      source: data,
      assign: {
        _key: generateEntityKey(data.id),
        _class: SERVICE_PRINCIPAL_ENTITY_CLASS,
        _type: SERVICE_PRINCIPAL_ENTITY_TYPE,
        function: ['service-account'],
        userType: 'service',
        category: ['infrastructure'],
        name: data.displayName,
        displayName: data.displayName,
        appDisplayName: data.appDisplayName,
        appId: data.appId,
        servicePrincipalType: data.servicePrincipalType,
        servicePrincipalNames: data.servicePrincipalNames,
      },
    },
  });

  assignTags(entity, data.tags);
  return entity;
}

export function createAccountGroupRelationship(
  account: Entity,
  group: Entity,
): Relationship {
  const parentKey = account._key;
  const childKey = generateEntityKey(group.id);

  return createDirectRelationship({
    _class: RelationshipClass.HAS,
    fromKey: parentKey,
    fromType: ACCOUNT_ENTITY_TYPE,
    toKey: childKey,
    toType: GROUP_ENTITY_TYPE,
    properties: {
      _type: ACCOUNT_GROUP_RELATIONSHIP_TYPE,
    },
  });
}

export function createAccountUserRelationship(
  account: Entity,
  user: Entity,
): Relationship {
  const fromKey = account._key;
  const toKey = generateEntityKey(user.id);

  return createDirectRelationship({
    _class: RelationshipClass.HAS,
    fromType: ACCOUNT_ENTITY_TYPE,
    fromKey,
    toType: USER_ENTITY_TYPE,
    toKey,
  });
}
