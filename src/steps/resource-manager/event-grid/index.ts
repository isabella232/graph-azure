import {
  Entity,
  Step,
  IntegrationStepExecutionContext,
  createDirectRelationship,
  RelationshipClass,
} from '@jupiterone/integration-sdk-core';
import { createAzureWebLinker } from '../../../azure';
import { IntegrationStepContext, IntegrationConfig } from '../../../types';
import { ACCOUNT_ENTITY_TYPE, STEP_AD_ACCOUNT } from '../../active-directory';
import {
  RESOURCE_GROUP_ENTITY,
  STEP_RM_RESOURCES_RESOURCE_GROUPS,
} from '../resources';
import createResourceGroupResourceRelationship from '../utils/createResourceGroupResourceRelationship';
import { EventGridClient } from './client';
import {
  EventGridEntities,
  EventGridRelationships,
  STEP_RM_EVENT_GRID_DOMAINS,
  STEP_RM_EVENT_GRID_DOMAIN_TOPICS,
  STEP_RM_EVENT_GRID_DOMAIN_TOPIC_SUBSCRIPTIONS,
  STEP_RM_EVENT_GRID_TOPIC_SUBSCRIPTIONS,
  STEP_RM_EVENT_GRID_TOPICS,
} from './constants';
import {
  createEventGridDomainEntity,
  createEventGridDomainTopicEntity,
  createEventGridTopicEntity,
  createEventGridTopicSubscriptionEntity,
} from './converters';
import {
  resourceGroupName,
  getEventGridDomainNameFromId,
} from '../../../azure/utils';

export * from './constants';

export async function fetchEventGridDomains(
  executionContext: IntegrationStepContext,
): Promise<void> {
  const { instance, logger, jobState } = executionContext;
  const accountEntity = await jobState.getData<Entity>(ACCOUNT_ENTITY_TYPE);

  const webLinker = createAzureWebLinker(accountEntity.defaultDomain as string);
  const client = new EventGridClient(instance.config, logger);

  await jobState.iterateEntities(
    { _type: RESOURCE_GROUP_ENTITY._type },
    async (resourceGroupEntity) => {
      await client.iterateDomains(
        (resourceGroupEntity as unknown) as { name: string },
        async (domain) => {
          const domainEntity = createEventGridDomainEntity(webLinker, domain);
          await jobState.addEntity(domainEntity);

          await jobState.addRelationship(
            await createResourceGroupResourceRelationship(
              executionContext,
              domainEntity,
            ),
          );
        },
      );
    },
  );
}

export async function fetchEventGridDomainTopics(
  executionContext: IntegrationStepContext,
): Promise<void> {
  const { instance, logger, jobState } = executionContext;
  const accountEntity = await jobState.getData<Entity>(ACCOUNT_ENTITY_TYPE);

  const webLinker = createAzureWebLinker(accountEntity.defaultDomain as string);
  const client = new EventGridClient(instance.config, logger);

  await jobState.iterateEntities(
    { _type: EventGridEntities.DOMAIN._type },
    async (domainEntity) => {
      await client.iterateDomainTopics(
        (domainEntity as unknown) as { id: string; name: string },
        async (domainTopic) => {
          const domainTopicEntity = createEventGridDomainTopicEntity(
            webLinker,
            domainTopic,
          );
          await jobState.addEntity(domainTopicEntity);

          await jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.HAS,
              from: domainEntity,
              to: domainTopicEntity,
            }),
          );
        },
      );
    },
  );
}

export async function fetchEventGridDomainTopicSubscriptions(
  executionContext: IntegrationStepContext,
): Promise<void> {
  const { instance, logger, jobState } = executionContext;
  const accountEntity = await jobState.getData<Entity>(ACCOUNT_ENTITY_TYPE);

  const webLinker = createAzureWebLinker(accountEntity.defaultDomain as string);
  const client = new EventGridClient(instance.config, logger);

  await jobState.iterateEntities(
    { _type: EventGridEntities.DOMAIN_TOPIC._type },
    async (domainTopicEntity) => {
      const { id, name: domainTopicName } = domainTopicEntity;
      const resourceGroup = resourceGroupName(id, true)!;
      const domainName = getEventGridDomainNameFromId(id);

      if (resourceGroup && domainName && domainTopicName) {
        await client.iterateDomainTopicSubscriptions(
          ({
            resourceGroupName: resourceGroup,
            domainTopicName,
            domainName,
          } as unknown) as {
            resourceGroupName: string;
            domainTopicName: string;
            domainName: string;
          },
          async (domainTopicSubscription) => {
            const domainTopicSubscriptionEntity = createEventGridTopicSubscriptionEntity(
              webLinker,
              domainTopicSubscription,
            );
            await jobState.addEntity(domainTopicSubscriptionEntity);
            await jobState.addRelationship(
              createDirectRelationship({
                _class: RelationshipClass.HAS,
                from: domainTopicEntity,
                to: domainTopicSubscriptionEntity,
              }),
            );
          },
        );
      }
    },
  );
}

export async function fetchEventGridTopics(
  executionContext: IntegrationStepContext,
): Promise<void> {
  const { instance, logger, jobState } = executionContext;
  const accountEntity = await jobState.getData<Entity>(ACCOUNT_ENTITY_TYPE);

  const webLinker = createAzureWebLinker(accountEntity.defaultDomain as string);
  const client = new EventGridClient(instance.config, logger);

  await jobState.iterateEntities(
    { _type: RESOURCE_GROUP_ENTITY._type },
    async (resourceGroupEntity) => {
      await client.iterateTopics(
        (resourceGroupEntity as unknown) as { name: string },
        async (topic) => {
          const topicEntity = createEventGridTopicEntity(webLinker, topic);
          await jobState.addEntity(topicEntity);

          await jobState.addRelationship(
            await createResourceGroupResourceRelationship(
              executionContext,
              topicEntity,
            ),
          );
        },
      );
    },
  );
}

export async function fetchEventGridTopicSubscriptions(
  executionContext: IntegrationStepContext,
): Promise<void> {
  const { instance, logger, jobState } = executionContext;
  const accountEntity = await jobState.getData<Entity>(ACCOUNT_ENTITY_TYPE);

  const webLinker = createAzureWebLinker(accountEntity.defaultDomain as string);
  const client = new EventGridClient(instance.config, logger);

  await jobState.iterateEntities(
    { _type: EventGridEntities.TOPIC._type },
    async (topicEntity) => {
      await client.iterateTopicSubscriptions(
        (topicEntity as unknown) as { id: string; name: string; type: string },
        async (subscription) => {
          const subscriptionEntity = createEventGridTopicSubscriptionEntity(
            webLinker,
            subscription,
          );
          await jobState.addEntity(subscriptionEntity);
          await jobState.addRelationship(
            createDirectRelationship({
              _class: RelationshipClass.HAS,
              from: topicEntity,
              to: subscriptionEntity,
            }),
          );
        },
      );
    },
  );
}

export const eventGridSteps: Step<
  IntegrationStepExecutionContext<IntegrationConfig>
>[] = [
  {
    id: STEP_RM_EVENT_GRID_DOMAINS,
    name: 'Event Grid Domains',
    entities: [EventGridEntities.DOMAIN],
    relationships: [EventGridRelationships.RESOURCE_GROUP_HAS_DOMAIN],
    dependsOn: [STEP_AD_ACCOUNT, STEP_RM_RESOURCES_RESOURCE_GROUPS],
    executionHandler: fetchEventGridDomains,
  },
  {
    id: STEP_RM_EVENT_GRID_DOMAIN_TOPICS,
    name: 'Event Grid Domain Topics',
    entities: [EventGridEntities.DOMAIN_TOPIC],
    relationships: [EventGridRelationships.DOMAIN_HAS_DOMAIN_TOPIC],
    dependsOn: [
      STEP_AD_ACCOUNT,
      STEP_RM_RESOURCES_RESOURCE_GROUPS,
      STEP_RM_EVENT_GRID_DOMAINS,
    ],
    executionHandler: fetchEventGridDomainTopics,
  },
  {
    id: STEP_RM_EVENT_GRID_DOMAIN_TOPIC_SUBSCRIPTIONS,
    name: 'Event Grid Domain Topic Subscriptions',
    entities: [EventGridEntities.TOPIC_SUBSCRIPTION],
    relationships: [EventGridRelationships.DOMAIN_TOPIC_HAS_SUBSCRIPTION],
    dependsOn: [
      STEP_AD_ACCOUNT,
      STEP_RM_RESOURCES_RESOURCE_GROUPS,
      STEP_RM_EVENT_GRID_DOMAINS,
      STEP_RM_EVENT_GRID_DOMAIN_TOPICS,
    ],
    executionHandler: fetchEventGridDomainTopicSubscriptions,
  },
  // TODO: Subscriptions? Global? regional? account? resource group?
  {
    id: STEP_RM_EVENT_GRID_TOPICS,
    name: 'Event Grid Topics',
    entities: [EventGridEntities.TOPIC],
    relationships: [EventGridRelationships.RESOURCE_GROUP_HAS_TOPIC],
    dependsOn: [STEP_AD_ACCOUNT, STEP_RM_RESOURCES_RESOURCE_GROUPS],
    executionHandler: fetchEventGridTopics,
  },

  {
    id: STEP_RM_EVENT_GRID_TOPIC_SUBSCRIPTIONS,
    name: 'Event Grid Topic Subscriptions',
    entities: [EventGridEntities.TOPIC_SUBSCRIPTION],
    relationships: [EventGridRelationships.TOPIC_HAS_SUBSCRIPTION],
    dependsOn: [
      STEP_AD_ACCOUNT,
      STEP_RM_RESOURCES_RESOURCE_GROUPS,
      STEP_RM_EVENT_GRID_TOPICS,
    ],
    executionHandler: fetchEventGridTopicSubscriptions,
  },
];
