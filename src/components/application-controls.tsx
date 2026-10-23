import type { PropsWithChildren } from 'react';
import { View, Text } from 'react-native';
import { Field, Choice, Card } from './registerbox-ui';
import { GstSelect } from './gst-ui';
import { palette } from '@/constants/design';

export const ApplicationField = Field;
export const ApplicationSelect = GstSelect;
export const ApplicationConfirm = Choice;
export function ApplicationCard({ children, style }: PropsWithChildren<{ style?: object; variant?: 'review' | 'document' }>) { return <Card style={style}>{children}</Card>; }
export function ApplicationReviewItem({ children }: PropsWithChildren) { return <View style={{ gap: 3 }}>{children}</View>; }
export function ApplicationRow({ children }: PropsWithChildren) { return <View style={{ gap: 16 }}>{children}</View>; }
export function ApplicationHint({ children }: PropsWithChildren) { return <Text style={{ fontSize: 13, lineHeight: 20, color: palette.muted }}>{children}</Text>; }
