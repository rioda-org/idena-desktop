import React from 'react'
import NextLink from 'next/link'
import {Button, Link, Stack, Text, useToast} from '@chakra-ui/core'
import {useTranslation} from 'react-i18next'
import {useMachine} from '@xstate/react'
import {Page, PageTitle} from '../../screens/app/components'
import {
  FlipFilter as FilterList,
  FlipFilterOption as FilterOption,
} from '../../screens/flips/components'
import {IconLink} from '../../shared/components/link'
import {VotingStatus} from '../../shared/types'
import {FloatDebug, Toast} from '../../shared/components/components'
import {votingListMachine} from '../../screens/oracles/machines'
import {
  VotingFilter,
  VotingFilterList,
  VotingCardSkeleton,
  VotingSkeleton,
  FillPlaceholder,
  FillCenter,
} from '../../screens/oracles/components'
import {useEpochState} from '../../shared/providers/epoch-context'
import {VotingCard} from '../../screens/oracles/containers'
import {useIdentityState} from '../../shared/providers/identity-context'
import {eitherState} from '../../shared/utils/utils'
import {IconButton2} from '../../shared/components/button'

function VotingListPage() {
  const {t} = useTranslation()

  const toast = useToast()

  const identity = useIdentityState()
  const epoch = useEpochState()

  const [current, send] = useMachine(votingListMachine, {
    context: {epoch, identity},
    actions: {
      onError: (_, {data: {message}}) => {
        toast({
          status: 'error',
          // eslint-disable-next-line react/display-name
          render: () => <Toast title={message} status="error" />,
        })
      },
    },
  })
  const {votings, filter, showAll = true, continuationToken} = current.context

  return (
    <Page>
      <PageTitle mb={4}>{t('Oracle votings')}</PageTitle>
      <Stack isInline spacing={20} w="full" flex={1}>
        <Stack spacing={8}>
          <VotingSkeleton isLoaded={!current.matches('preload')}>
            <FilterList
              defaultValue="todo"
              display="flex"
              onChange={value => send('TOGGLE_SHOW_ALL', {value})}
            >
              <FilterOption value="todo">{t('To do')}</FilterOption>
              <FilterOption value="voting">{t('Voting')}</FilterOption>
              <FilterOption value="closed">{t('Closed')}</FilterOption>
              <IconButton2
                value="owned"
                isActive={!showAll}
                aria-checked={!showAll}
                role="radio"
                icon="user"
                ml="auto"
              >
                {t('My votings')}
              </IconButton2>
            </FilterList>
          </VotingSkeleton>
          <Stack spacing={6} w="md" flex={1}>
            {current.matches('failure') && (
              <FillPlaceholder>{current.context.errorMessage}</FillPlaceholder>
            )}

            {eitherState(current, 'loading.late') &&
              Array.from({length: 5}).map((_, idx) => (
                <VotingCardSkeleton key={idx} />
              ))}

            {current.matches('loaded') && votings.length === 0 && (
              <FillCenter justify="center">
                <>
                  {!showAll && <Text>{t(`There are no votings yet.`)}</Text>}

                  {showAll && (
                    <Text>
                      {identity.isValidated
                        ? t(`No votings for you 🤷‍♂️`)
                        : t(`There are no votings yet.`)}
                    </Text>
                  )}

                  <NextLink href="/oracles/new">
                    <Link
                      color="brandBlue.500"
                      fontWeight={500}
                      _hover={{
                        textDecoration: 'none',
                      }}
                    >
                      {t('Create new voting')}
                    </Link>
                  </NextLink>
                </>
              </FillCenter>
            )}

            {current.matches('loaded') &&
              votings.map(({id, ref}) => (
                <VotingCard key={id} votingRef={ref} />
              ))}

            {current.matches('loaded') && continuationToken && (
              <Button
                variant="link"
                variantColor="brandBlue"
                onClick={() => send('LOAD_MORE')}
              >
                {t('Load more')}
              </Button>
            )}
          </Stack>
        </Stack>
        <VotingSkeleton isLoaded={!current.matches('preload')}>
          <Stack spacing={8} align="flex-start" maxW={40}>
            <IconLink href="/oracles/new" icon="plus-solid" ml={-2}>
              {t('New voting')}
            </IconLink>
            <VotingFilterList
              value={filter}
              onChange={e => send('FILTER', {filter: e.target.value})}
            >
              <Text fontWeight={500}>{t('Status')}</Text>
              <VotingFilter value={VotingStatus.Open} />
              <VotingFilter value={VotingStatus.Pending} />
              <VotingFilter value={VotingStatus.Voted} />
              <VotingFilter value={VotingStatus.Counting} />
              <VotingFilter value={VotingStatus.Archived} />
            </VotingFilterList>
          </Stack>
        </VotingSkeleton>
      </Stack>
      <FloatDebug>{current.value}</FloatDebug>
    </Page>
  )
}

export default VotingListPage
