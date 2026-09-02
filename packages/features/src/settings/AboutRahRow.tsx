import type { ExternalNavigation } from '@rahrow/core/platform/capabilities.ts'
import {
	createRahrowAboutManifest,
	isAllowedAboutTarget,
	type RahrowAboutConfiguration,
	type RahrowAboutGroup,
	type RahrowAboutLinkId,
} from '@rahrow/core/product/about.ts'
import type { EngineManifest } from '@rahrow/core/runtime/proxy-engine.ts'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { Heading } from '@rahrow/ui/components/ui/heading.tsx'
import { Text } from '@rahrow/ui/components/ui/text.tsx'
import { useState } from 'react'

import { useAppTranslation } from '../app/app-i18n.tsx'
import { BrandLogo } from '../app/BrandLogo.tsx'
import styles from './AboutRahRow.module.css'

export interface AboutRahRowProps {
	readonly version?: string
	readonly engines?: readonly EngineManifest[]
	readonly externalNavigation?: ExternalNavigation
	readonly configuration?: RahrowAboutConfiguration
}

const groupOrder: readonly RahrowAboutGroup[] = [
	'support',
	'source',
	'organization',
]

export function AboutRahRow({
	version,
	engines = [],
	externalNavigation,
	configuration,
}: AboutRahRowProps) {
	const { t } = useAppTranslation()
	const [failure, setFailure] = useState(false)
	const manifest = createRahrowAboutManifest(configuration)
	const groupedLinks = groupOrder.map((group) => ({
		group,
		links: manifest.links.filter((link) => link.group === group),
	}))
	const open = async (target: string) => {
		if (!externalNavigation || !isAllowedAboutTarget(target)) return
		setFailure(false)
		try {
			await externalNavigation.open(target)
		} catch {
			setFailure(true)
		}
	}

	return (
		<div className={styles.about}>
			<header className={styles.aboutIdentity}>
				<BrandLogo className={styles.aboutLogo} label={t('app.name')} />
				<Heading level={2} className={styles.aboutTitle}>
					{t('app.name')}
				</Heading>
				<Text className={styles.aboutDescription}>
					{t('settings.about.description')}
				</Text>
				<Text className={styles.aboutOwnership}>
					{t('settings.about.ownership')}
				</Text>
			</header>

			<section
				className={styles.aboutFacts}
				aria-label={t('settings.about.build')}
			>
				<div>
					<span>{t('settings.about.versionLabel')}</span>
					<strong>
						{version
							? t('settings.about.appVersion', { version })
							: t('settings.about.versionUnavailable')}
					</strong>
				</div>
				<div>
					<span>{t('settings.about.licenseLabel')}</span>
					<strong>{manifest.license.name}</strong>
				</div>
				{engines.length > 0 ? (
					<div>
						<span>{t('settings.about.enginesLabel')}</span>
						<strong>{engines.map((engine) => engine.id).join(', ')}</strong>
						<small>{t('settings.about.engineMetadataUnavailable')}</small>
					</div>
				) : null}
			</section>

			{externalNavigation ? (
				<div className={styles.aboutGroups}>
					{groupedLinks.map(({ group, links }) => (
						<section key={group} aria-labelledby={`about-${group}`}>
							<Heading level={3} id={`about-${group}`}>
								{groupLabel(group, t)}
							</Heading>
							<div className={styles.aboutActions}>
								{links.map((link) => (
									<Button
										key={link.id}
										variant='outline'
										onClick={() => void open(link.target)}
									>
										{linkLabel(link.id, t)}
									</Button>
								))}
							</div>
						</section>
					))}
				</div>
			) : (
				<Text className={styles.aboutUnavailable}>
					{t('settings.about.linksUnavailable')}
				</Text>
			)}
			{failure ? (
				<p className={styles.aboutFailure} role='alert'>
					{t('settings.about.openFailed')}
				</p>
			) : null}
		</div>
	)
}

type Translate = ReturnType<typeof useAppTranslation>['t']

function groupLabel(group: RahrowAboutGroup, t: Translate): string {
	return {
		support: t('settings.about.groups.support'),
		source: t('settings.about.groups.source'),
		organization: t('settings.about.groups.organization'),
	}[group]
}

function linkLabel(id: RahrowAboutLinkId, t: Translate): string {
	return {
		'support-email': t('settings.about.links.email'),
		telegram: t('settings.about.links.telegram'),
		source: t('settings.about.links.source'),
		license: t('settings.about.links.license'),
		organization: t('settings.about.links.organization'),
		'organization-site': t('settings.about.links.organizationSite'),
		'product-site': t('settings.about.links.productSite'),
		donation: t('settings.about.links.donation'),
	}[id]
}
