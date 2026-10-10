import { Linking, Text } from 'react-native';
import { Button, Screen, PageHeader, Card } from '@/components/registerbox-ui';
import { contact } from '@/components/website/content';
export default function ContactScreen(){return <Screen><PageHeader title="Contact RegisterBox"/><Card><Text>{contact.email}</Text><Text>{contact.phone}</Text><Text>{contact.address}</Text></Card><Button title="Chat on WhatsApp" onPress={()=>void Linking.openURL(contact.whatsapp)}/><Button title="Email RegisterBox" variant="secondary" onPress={()=>void Linking.openURL(`mailto:${contact.email}`)}/></Screen>;}
