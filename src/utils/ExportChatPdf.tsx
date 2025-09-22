import {
  Page,
  Text,
  Document,
  StyleSheet,
  View,
  Image,
  PDFDownloadLink,
} from "@react-pdf/renderer";
import type { ChatMessage } from "../service/chatStore";

// Styling untuk PDF
const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 11,
    fontFamily: "Helvetica",
  },
  role: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 4,
  },
  text: {
    marginBottom: 8,
  },
  chart: {
    width: 400,
    marginVertical: 8,
  },
  messageBlock: {
    marginBottom: 12,
  },
});

export function ChatPdfDoc({
  messages,
}: {
  messages: (ChatMessage & { chartImage?: string })[];
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {messages.map((m, i) => (
          <View key={i} style={styles.messageBlock} wrap={false}>
            <Text style={styles.role}>{m.role.toUpperCase()}:</Text>
            <Text style={styles.text}>{m.text}</Text>
            {m.chartImage && <Image src={m.chartImage} style={styles.chart} />}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export function ExportChatPdfButton({
  messages,
  filename,
}: {
  messages: (ChatMessage & { chartImage?: string })[];
  filename: string;
}) {
  return (
    <PDFDownloadLink
      document={<ChatPdfDoc messages={messages} />}
      fileName={filename}
    >
      {({ loading }) => (loading ? "Generating PDF…" : "Download PDF")}
    </PDFDownloadLink>
  );
}
