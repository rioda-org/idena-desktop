/* eslint-disable react/prop-types */
import React from 'react'
import {useRouter} from 'next/router'
import {useTranslation} from 'react-i18next'
import {useService} from '@xstate/react'
import {
  Box,
  Stack,
  Text,
  Icon,
  Flex,
  Divider,
  useDisclosure,
  Stat,
  StatLabel,
  StatNumber,
} from '@chakra-ui/core'
import {toLocaleDna, eitherState} from '../../shared/utils/utils'
import {Avatar, Drawer, Input} from '../../shared/components/components'
import {VotingStatus, VoteOption} from '../../shared/types'
import {
  VotingResultBar,
  VotingBadge,
  OracleDrawerHeader,
  OracleDrawerBody,
  OracleFormControl,
  OracleFormHelper,
  VotingListDivider,
} from './components'
import {PrimaryButton, SecondaryButton} from '../../shared/components/button'
import {Link} from '../../shared/components'
import {useIdentityState} from '../../shared/providers/identity-context'
import {viewVotingHref, votingFinishDate} from './utils'

export function VotingCard({votingRef, ...props}) {
  const router = useRouter()

  const {t, i18n} = useTranslation()

  const {
    isOpen: isOpenAddFund,
    onOpen: onOpenAddFund,
    onClose: onCloseAddFund,
  } = useDisclosure()

  const [current, send] = useService(votingRef)

  const {
    id,
    title,
    desc,
    issuer,
    status,
    balance = 0,
    fundingAmount = balance,
    startDate,
    votingDuration,
    publicVotingDuration,
    finishDate = votingFinishDate({
      startDate,
      votingDuration,
      publicVotingDuration,
    }),
    votesCount,
    contractHash,
  } = current.context

  const toDna = toLocaleDna(i18n.language)

  const viewHref = viewVotingHref(id)

  const eitherIdleState = (...states) =>
    eitherState(current, ...states.map(s => `idle.${s}`))

  return (
    <>
      <Box key={id} {...props}>
        <Stack isInline spacing={2} mb={3} align="center">
          <VotingStatusBadge status={status}>{t(status)}</VotingStatusBadge>
          <VotingBadge bg="gray.300" color="muted" pl="1/2">
            <Stack isInline spacing={1} align="center">
              <Avatar w={5} h={5} address={issuer} />
              <Text>{issuer}</Text>
            </Stack>
          </VotingBadge>
        </Stack>
        <Link href={viewHref}>
          <Text fontSize="base" fontWeight={500} mb={2}>
            {title}
            <VotingStatusBadge status={status} ml={2}>
              {JSON.stringify(current.value)}
            </VotingStatusBadge>
          </Text>
        </Link>
        <Text color="muted" mb={4}>
          {desc}
        </Text>
        {eitherIdleState(
          VotingStatus.Voted,
          VotingStatus.Archived,
          VotingStatus.Counting
        ) && (
          <Stack spacing={2} mb={6}>
            <Text color="muted" fontSize="sm">
              {t('Results')}
            </Text>
            <VotingResultBar action={VoteOption.Confirm} value={60} />
            <VotingResultBar action={VoteOption.Reject} value={40} />
          </Stack>
        )}
        <Stack isInline spacing={2} align="center" mb={6}>
          <Icon name="star" size={4} color="white" />
          <Text fontWeight={500}>
            {t('Total prize')}: {toDna(fundingAmount)}
          </Text>
        </Stack>
        <Flex justify="space-between" align="center">
          <Stack isInline spacing={2}>
            {eitherIdleState(VotingStatus.Pending) && (
              <PrimaryButton onClick={() => send('START_VOTING')}>
                {t('Launch')}
              </PrimaryButton>
            )}
            {eitherIdleState(
              VotingStatus.Running,
              VotingStatus.Voted,
              VotingStatus.Archived,
              VotingStatus.Counting
            ) && (
              <PrimaryButton onClick={() => router.push(viewHref)}>
                {t('Open')}
              </PrimaryButton>
            )}
            <SecondaryButton onClick={onOpenAddFund}>
              {t('Add fund')}
            </SecondaryButton>
          </Stack>
          <Stack isInline spacing={3}>
            <Text>
              <Text as="span" color="muted">
                {t('Deadline')}:
              </Text>{' '}
              <Text as="span">{new Date(finishDate).toLocaleString()}</Text>
            </Text>
            <Divider
              orientation="vertical"
              borderColor="gray.300"
              borderLeft="1px"
            />
            <Stack isInline spacing={2} align="center">
              <Icon name="user" w={4} h={4} />
              <Text as="span">{votesCount || 0} votes</Text>
            </Stack>
          </Stack>
        </Flex>
        <VotingListDivider />
      </Box>

      <AddFundDrawer
        isOpen={isOpenAddFund}
        onClose={onCloseAddFund}
        from={issuer}
        to={contractHash}
        onAddFund={amount => {
          send('ADD_FUND', {amount})
          onCloseAddFund()
        }}
      />
    </>
  )
}

export function VotingStatusBadge({status, ...props}) {
  const colors = (() => {
    switch (status) {
      case VotingStatus.Pending:
        return {
          bg: 'rgb(218 121 255 /0.2)',
          color: 'rgb(218 121 255)',
        }
      case VotingStatus.Running:
        return {
          bg: 'green.020',
          color: 'green.500',
        }
      case VotingStatus.Voted:
        return {
          bg: 'blue.020',
          color: 'blue.500',
        }
      case VotingStatus.Deploying:
      case VotingStatus.Funding:
      case VotingStatus.Starting:
        return {
          bg: 'orange.020',
          color: 'orange.500',
        }
      case VotingStatus.Counting:
        return {
          bg: 'red.020',
          color: 'red.500',
        }
      default:
      case VotingStatus.Archived:
        return {
          bg: 'gray.300',
          color: 'muted',
        }
    }
  })()

  return <VotingBadge {...colors} {...props} />
}

export function AddFundDrawer({from, to, onAddFund, ...props}) {
  const {t, i18n} = useTranslation()

  const toDna = toLocaleDna(i18n.language)

  return (
    <Drawer {...props}>
      <OracleDrawerHeader icon="add-fund">
        {t('Add fund', {nsSeparator: '!'})}
      </OracleDrawerHeader>
      <Box
        as="form"
        onSubmit={e => {
          e.preventDefault()
          const {
            amountInput: {value: amount},
          } = e.target.elements
          onAddFund(Number(amount))
        }}
      >
        <OracleDrawerBody>
          <OracleFormControl label={t('Transfer from')}>
            <Input defaultValue={from} />
            <OracleFormHelper label={t('Available')} value={toDna(80200)} />
          </OracleFormControl>
          <OracleFormControl label="To address">
            <Input isDisabled value={to} />
          </OracleFormControl>
          <OracleFormControl label={t('Deposit, DNA')}>
            <Input name="amountInput" />
            <OracleFormHelper label={t('Fee')} value={toDna(0.01)} />
            <OracleFormHelper label={t('Total amount')} value={toDna(240.01)} />
          </OracleFormControl>
          <PrimaryButton type="submit" mt={3} ml="auto">
            {t('Send')}
          </PrimaryButton>
        </OracleDrawerBody>
      </Box>
    </Drawer>
  )
}

export function VoteDrawer({option, from, to, deposit = 0, onVote, ...props}) {
  const {t, i18n} = useTranslation()

  const {balance} = useIdentityState()

  const toDna = toLocaleDna(i18n.language)

  return (
    <Drawer {...props}>
      <OracleDrawerHeader
        icon="send-out"
        variantColor={option === VoteOption.Reject ? 'red' : 'blue'}
      >
        {t('Voting: {{option}}', {option, nsSeparator: '!'})}
      </OracleDrawerHeader>
      <OracleDrawerBody>
        <OracleFormControl label={t('Transfer from')}>
          <Input defaultValue={from} />
          <OracleFormHelper label={t('Available')} value={toDna(balance)} />
        </OracleFormControl>
        <OracleFormControl label="To address">
          <Input isDisabled value={to} />
        </OracleFormControl>
        <OracleFormControl label={t('Deposit, DNA')}>
          <Input isDisabled value={deposit} />
          <OracleFormHelper label={t('Fee')} value={toDna(0.01)} />
          <OracleFormHelper
            label={t('Total amount')}
            value={toDna(deposit * 1.01)}
          />
        </OracleFormControl>
        <PrimaryButton mt={3} ml="auto" onClick={onVote}>
          {t('Send')}
        </PrimaryButton>
      </OracleDrawerBody>
    </Drawer>
  )
}

export function AsideStat({label, value, ...props}) {
  return (
    <Stat {...props}>
      <StatLabel color="muted" fontSize="md">
        {label}
      </StatLabel>
      <StatNumber fontSize="base" fontWeight={500}>
        {value}
      </StatNumber>
    </Stat>
  )
}
