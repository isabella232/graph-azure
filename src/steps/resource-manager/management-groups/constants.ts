import { RelationshipClass } from '@jupiterone/integration-sdk-core';
import { ACCOUNT_ENTITY_TYPE } from '../../active-directory/constants';

export const ManagementGroupSteps = {
  MANAGEMENT_GROUPS: 'rm-management-groups',
};

export const ManagementGroupEntities = {
  MANAGEMENT_GROUP: {
    _type: 'azure_management_group',
    _class: ['Group'],
    resourceName: '[RM] Management Group',
  },
};

export const ManagementGroupRelationships = {
  ACCOUNT_HAS_ROOT_MANAGEMENT_GROUP: {
    _type: 'azure_account_has_management_group',
    sourceType: ACCOUNT_ENTITY_TYPE,
    _class: RelationshipClass.HAS,
    targetType: ManagementGroupEntities.MANAGEMENT_GROUP._type,
  },
  MANAGEMENT_GROUP_CONTAINS_MANAGEMENT_GROUP: {
    _type: 'azure_management_group_contains_group',
    sourceType: ManagementGroupEntities.MANAGEMENT_GROUP._type,
    _class: RelationshipClass.CONTAINS,
    targetType: ManagementGroupEntities.MANAGEMENT_GROUP._type,
  },
};
